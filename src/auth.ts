import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Line from "next-auth/providers/line";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { createSignedCookieValue, readSignedCookieValue } from "@/lib/signed-cookie";
import { verifyTotp } from "@/lib/totp";

import type { Provider } from "next-auth/providers";

// Validate AUTH_SECRET at module load time
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET must be set and at least 32 characters. Generate with: openssl rand -base64 48",
  );
}

const PLAN_REFRESH_TTL_MS = Number(process.env.PLAN_REFRESH_TTL_MS ?? 5 * 60 * 1000);
const LINE_LOOKUP_TIMEOUT_MS = Number(process.env.LINE_LOOKUP_TIMEOUT_MS ?? 4000);

interface LineAuthCtx {
  tenant: string;
}

interface LineAuthUserCtx {
  userId: string;
  tenantId: string;
  role: string;
  departmentId: string | null;
  plan: string;
  trialEndsAt: string | null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(t);
        reject(err);
      });
  });
}

const signInSchema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(), // 6-digit TOTP code (required if 2FA enabled)
});

// Build providers list — LINE is only added when env vars are configured
const providers: Provider[] = [
  Credentials({
    name: "Email and Password",
    credentials: {
      tenant: { label: "Tenant", type: "text" },
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpCode: { label: "TOTP Code", type: "text" },
    },
    async authorize(raw) {
      const { tenant, email, password, totpCode } = signInSchema.parse(raw);

      // Rate limit: 10 attempts per tenant+email per 15 minutes
      const { limited } = await rateLimit(`login:${tenant}:${email}`, 10, 15 * 60 * 1000);
      if (limited) throw new Error("RATE_LIMITED");

      // Wrap DB queries so a connection failure surfaces as a distinct error
      let user;
      try {
        user = await prisma.user.findFirst({
          where: {
            email,
            active: true,
            tenant: { slug: tenant },
          },
          select: {
            id: true,
            email: true,
            name: true,
            tenantId: true,
            role: true,
            departmentId: true,
            passwordHash: true,
            totpEnabled: true,
            totpSecret: true,
            tenant: {
              select: { plan: true, trialEndsAt: true },
            },
          },
        });
      } catch (err) {
        logger.error("login.db_error", { tenant, email }, err as Error);
        throw new Error("SERVICE_UNAVAILABLE");
      }

      if (!user) return null;
      if (!user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        // Audit: login failed
        prisma.auditLog.create({
          data: {
            tenantId: user.tenantId,
            actorUserId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            afterJson: { reason: "invalid_password" },
          },
        }).catch((err) => logger.error("audit.write_failed", {}, err));
        return null;
      }

      // Check TOTP if 2FA is enabled
      if (user.totpEnabled && user.totpSecret) {
        if (!totpCode) {
          // Signal the client that TOTP is required (throw with specific message)
          throw new Error("TOTP_REQUIRED");
        }
        const totpValid = verifyTotp(user.totpSecret, totpCode);
        if (!totpValid) {
          prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              actorUserId: user.id,
              action: "LOGIN_FAILED",
              entityType: "User",
              entityId: user.id,
              afterJson: { reason: "invalid_totp" },
            },
          }).catch((err) => logger.error("audit.write_failed", {}, err));
          throw new Error("TOTP_INVALID");
        }
      }

      // Audit: login success
      prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
        },
      }).catch((err) => logger.error("audit.write_failed", {}, err));

      // Return user data; custom fields are forwarded via jwt/session callbacks.
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
        departmentId: user.departmentId,
        plan: user.tenant.plan,
        trialEndsAt: user.tenant.trialEndsAt?.toISOString() ?? null,
      };
    },
  }),
];

if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
  providers.push(
    Line({
      clientId: process.env.LINE_CHANNEL_ID,
      clientSecret: process.env.LINE_CHANNEL_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is removed: Credentials provider + JWT sessions don't need
  // a database adapter. We handle user lookup directly in authorize().
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "line") {
        const cookieStore = await cookies();
        const authSecret = process.env.AUTH_SECRET!;
        const tenantCtx = readSignedCookieValue<LineAuthCtx>(
          cookieStore.get("line_auth_ctx")?.value,
          authSecret,
        );
        if (!tenantCtx?.tenant) {
          logger.warn("line_login.invalid_tenant_context");
          return "/login?error=INVALID_TENANT_STATE";
        }
        const tenantSlug = tenantCtx.tenant;

        let dbUser;
        try {
          dbUser = await withTimeout(
            prisma.user.findFirst({
              where: {
                lineId: user.id,
                active: true,
                tenant: { slug: tenantSlug },
              },
              select: {
                id: true,
                tenantId: true,
                role: true,
                departmentId: true,
                tenant: {
                  select: { plan: true, trialEndsAt: true },
                },
              },
            }),
            LINE_LOOKUP_TIMEOUT_MS,
          );
        } catch (err) {
          logger.error("line_login.lookup_failed", { tenantSlug }, err as Error);
          return "/login?error=SERVICE_UNAVAILABLE";
        }

        const tenantExists = dbUser
          ? true
          : !!(await withTimeout(
              prisma.tenant.findUnique({
                where: { slug: tenantSlug },
                select: { id: true },
              }),
              LINE_LOOKUP_TIMEOUT_MS,
            ).catch(() => null));
        if (!tenantExists) {
          logger.info("line_login.tenant_not_found", { tenantSlug });
          return "/login?error=TENANT_NOT_FOUND";
        }
        if (!dbUser) {
          logger.info("line_login.not_linked", { tenantSlug });
          return "/login?error=LINE_NOT_LINKED";
        }

        const signedUserCtx = createSignedCookieValue<LineAuthUserCtx>(
          {
            userId: dbUser.id,
            tenantId: dbUser.tenantId,
            role: dbUser.role,
            departmentId: dbUser.departmentId ?? null,
            plan: dbUser.tenant.plan,
            trialEndsAt: dbUser.tenant.trialEndsAt?.toISOString() ?? null,
          },
          authSecret,
          2 * 60 * 1000,
        );
        cookieStore.set("line_auth_user", signedUserCtx, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 2 * 60,
        });

        // Audit: LINE login success
        prisma.auditLog.create({
          data: {
            tenantId: dbUser.tenantId,
            actorUserId: dbUser.id,
            action: "LOGIN_SUCCESS_LINE",
            entityType: "User",
            entityId: dbUser.id,
          },
        }).catch((err) => logger.error("audit.write_failed", {}, err));

        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "credentials") {
        // On initial sign-in, `user` is set (from Credentials.authorize).
        const u = user as Record<string, unknown>;
        token.sub = u.id as string;
        token.tenantId = u.tenantId as string;
        token.role = u.role as string;
        token.departmentId = (u.departmentId as string) ?? null;
        token.plan = u.plan as string;
        token.trialEndsAt = (u.trialEndsAt as string) ?? null;
        token.planCheckedAt = Date.now();
      }
      if (account?.provider === "line" && account.access_token) {
        token.lineAccessToken = account.access_token;
      }

      if (account?.provider === "line" && user) {
        const cookieStore = await cookies();
        const authSecret = process.env.AUTH_SECRET!;
        const signedCtx = readSignedCookieValue<LineAuthUserCtx>(
          cookieStore.get("line_auth_user")?.value,
          authSecret,
        );
        if (signedCtx) {
          token.sub = signedCtx.userId;
          token.tenantId = signedCtx.tenantId;
          token.role = signedCtx.role;
          token.departmentId = signedCtx.departmentId;
          token.plan = signedCtx.plan;
          token.trialEndsAt = signedCtx.trialEndsAt;
          token.planCheckedAt = Date.now();
          cookieStore.delete("line_auth_user");
          cookieStore.delete("line_auth_ctx");
        } else {
          const tenantCtx = readSignedCookieValue<LineAuthCtx>(
            cookieStore.get("line_auth_ctx")?.value,
            authSecret,
          );
          if (!tenantCtx?.tenant) {
            logger.warn("line_login.user_context_missing");
            return token;
          }
          const fallbackUser = await withTimeout(
            prisma.user.findFirst({
              where: {
                lineId: user.id,
                active: true,
                tenant: { slug: tenantCtx.tenant },
              },
              select: {
                id: true,
                tenantId: true,
                role: true,
                departmentId: true,
                tenant: { select: { plan: true, trialEndsAt: true } },
              },
            }),
            LINE_LOOKUP_TIMEOUT_MS,
          ).catch(() => null);
          if (!fallbackUser) {
            logger.warn("line_login.fallback_lookup_failed", { tenant: tenantCtx.tenant });
            return token;
          }
          token.sub = fallbackUser.id;
          token.tenantId = fallbackUser.tenantId;
          token.role = fallbackUser.role;
          token.departmentId = fallbackUser.departmentId ?? null;
          token.plan = fallbackUser.tenant.plan;
          token.trialEndsAt = fallbackUser.tenant.trialEndsAt?.toISOString() ?? null;
          token.planCheckedAt = Date.now();
          cookieStore.delete("line_auth_ctx");
        }
      }

      // Refresh plan/trial with TTL to avoid DB hit on every authenticated request.
      const nowMs = Date.now();
      const shouldRefreshPlan =
        typeof token.planCheckedAt !== "number" ||
        nowMs - token.planCheckedAt > PLAN_REFRESH_TTL_MS;
      if (shouldRefreshPlan && token.tenantId && token.role !== "SUPER_ADMIN") {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: token.tenantId as string },
            select: { plan: true, trialEndsAt: true },
          });
          if (tenant) {
            token.plan = tenant.plan;
            token.trialEndsAt = tenant.trialEndsAt?.toISOString() ?? null;
          }
        } catch {
          // DB error — keep existing values in token
        } finally {
          token.planCheckedAt = nowMs;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // expose claims to the client
      const u = session.user as unknown as Record<string, unknown>;
      u.id = token.sub;
      u.tenantId = token.tenantId;
      u.role = token.role;
      u.departmentId = token.departmentId;
      u.plan = token.plan;
      return session;
    },
  },
});
