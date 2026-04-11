import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Line from "next-auth/providers/line";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyRecoveryCode, verifyTotp } from "@/lib/totp";

import type { Provider } from "next-auth/providers";

// Validate AUTH_SECRET at module load time
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET must be set and at least 32 characters. Generate with: openssl rand -base64 48",
  );
}

const PLAN_REFRESH_TTL_MS = Number(process.env.PLAN_REFRESH_TTL_MS ?? 5 * 60 * 1000);

const signInSchema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(), // 6-digit TOTP code (required if 2FA enabled)
  recoveryCode: z.string().optional(), // Single-use recovery code (alternate to totpCode)
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
      const { tenant, email, password, totpCode, recoveryCode } = signInSchema.parse(raw);

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
            totpRecoveryCodes: true,
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

      // Block suspended tenants and expired trials at the auth boundary
      // so no session JWT is issued for unauthorized accounts.
      if (user.tenant.plan === "SUSPENDED") {
        throw new Error("ACCOUNT_SUSPENDED");
      }
      if (
        user.tenant.plan === "TRIAL" &&
        user.tenant.trialEndsAt &&
        user.tenant.trialEndsAt.getTime() < Date.now()
      ) {
        throw new Error("TRIAL_EXPIRED");
      }

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

      // Check TOTP if 2FA is enabled. Accept either the 6-digit code OR a
      // single-use recovery code (with priority to TOTP when both provided).
      if (user.totpEnabled && user.totpSecret) {
        if (!totpCode && !recoveryCode) {
          // Signal the client that TOTP is required (throw with specific message)
          throw new Error("TOTP_REQUIRED");
        }

        let authOk = false;
        let usedRecoveryIndex = -1;

        if (totpCode) {
          authOk = verifyTotp(user.totpSecret, totpCode);
        }

        if (!authOk && recoveryCode) {
          const stored = Array.isArray(user.totpRecoveryCodes)
            ? (user.totpRecoveryCodes as string[])
            : [];
          usedRecoveryIndex = await verifyRecoveryCode(recoveryCode, stored);
          if (usedRecoveryIndex >= 0) {
            authOk = true;
            // Remove the consumed code so it cannot be reused.
            const remaining = stored.filter((_, i) => i !== usedRecoveryIndex);
            prisma.user
              .update({
                where: { id: user.id },
                data: { totpRecoveryCodes: remaining },
              })
              .catch((err) => logger.error("totp.recovery_consume_failed", {}, err));
          }
        }

        if (!authOk) {
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

        if (usedRecoveryIndex >= 0) {
          // Audit recovery code usage so admins see it
          prisma.auditLog.create({
            data: {
              tenantId: user.tenantId,
              actorUserId: user.id,
              action: "TOTP_RECOVERY_USED",
              entityType: "User",
              entityId: user.id,
            },
          }).catch((err) => logger.error("audit.write_failed", {}, err));
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
        // LINE login: verify the user has a linked lineId in the specified tenant
        const cookieStore = await cookies();
        const tenantSlug = cookieStore.get("line_auth_tenant")?.value;
        if (!tenantSlug) return "/login?error=NO_TENANT";

        const dbUser = await prisma.user.findFirst({
          where: {
            lineId: user.id,
            active: true,
            tenant: { slug: tenantSlug },
          },
          select: {
            id: true,
            tenantId: true,
            tenant: { select: { plan: true, trialEndsAt: true } },
          },
        });

        const tenantExists = dbUser
          ? true
          : !!(await prisma.tenant.findUnique({
              where: { slug: tenantSlug },
              select: { id: true },
            }));
        if (!tenantExists) {
          cookieStore.delete("line_auth_tenant");
          return "/login?error=TENANT_NOT_FOUND";
        }
        if (!dbUser) {
          cookieStore.delete("line_auth_tenant");
          return "/login?error=LINE_NOT_LINKED";
        }

        // Block suspended / expired-trial tenants at the auth boundary
        if (dbUser.tenant.plan === "SUSPENDED") {
          cookieStore.delete("line_auth_tenant");
          return "/login?error=ACCOUNT_SUSPENDED";
        }
        if (
          dbUser.tenant.plan === "TRIAL" &&
          dbUser.tenant.trialEndsAt &&
          dbUser.tenant.trialEndsAt.getTime() < Date.now()
        ) {
          cookieStore.delete("line_auth_tenant");
          return "/login?error=TRIAL_EXPIRED";
        }

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

        // Clean up the tenant cookie — it has served its purpose and should
        // not persist beyond this login attempt (prevents multi-tenant confusion).
        cookieStore.delete("line_auth_tenant");
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
        // LINE login — look up user from DB to populate JWT claims
        const cookieStore = await cookies();
        const tenantSlug = cookieStore.get("line_auth_tenant")?.value;
        if (tenantSlug) {
          const dbUser = await prisma.user.findFirst({
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
                select: {
                  plan: true,
                  trialEndsAt: true,
                },
              },
            },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.tenantId = dbUser.tenantId;
            token.role = dbUser.role;
            token.departmentId = dbUser.departmentId ?? null;
            token.plan = dbUser.tenant.plan;
            token.trialEndsAt = dbUser.tenant.trialEndsAt?.toISOString() ?? null;
            token.planCheckedAt = Date.now();
          }
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
