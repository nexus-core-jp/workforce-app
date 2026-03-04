import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Line from "next-auth/providers/line";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";
import { LineProvider } from "@/lib/line-provider";

import type { Provider } from "next-auth/providers";

// Validate AUTH_SECRET at module load time
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    "AUTH_SECRET must be set and at least 32 characters. Generate with: openssl rand -base64 48",
  );
}

const signInSchema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(), // 6-digit TOTP code (required if 2FA enabled)
});

const isProduction = process.env.NODE_ENV === "production";

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

      const dbTenant = await prisma.tenant.findUnique({ where: { slug: tenant } });
      if (!dbTenant) return null;

      const user = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: dbTenant.id, email } },
      });
      if (!user?.active) return null;
      if (!user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        // Audit: login failed
        prisma.auditLog.create({
          data: {
            tenantId: dbTenant.id,
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
              tenantId: dbTenant.id,
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
          tenantId: dbTenant.id,
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
        plan: dbTenant.plan,
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
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: isProduction,
      },
    },
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

        const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
        if (!tenant) return "/login?error=TENANT_NOT_FOUND";

        const lineId = user.id;
        const dbUser = await prisma.user.findFirst({
          where: { tenantId: tenant.id, lineId, active: true },
        });

        if (!dbUser) return "/login?error=LINE_NOT_LINKED";

        // Audit: LINE login success
        prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
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
      }
      if (account?.provider === "line" && account.access_token) {
        token.lineAccessToken = account.access_token;
      }

      if (account?.provider === "line" && user) {
        // LINE login — look up user from DB to populate JWT claims
        const cookieStore = await cookies();
        const tenantSlug = cookieStore.get("line_auth_tenant")?.value;
        if (tenantSlug) {
          const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
          if (tenant) {
            const dbUser = await prisma.user.findFirst({
              where: { tenantId: tenant.id, lineId: user.id, active: true },
            });
            if (dbUser) {
              token.sub = dbUser.id;
              token.tenantId = dbUser.tenantId;
              token.role = dbUser.role;
              token.departmentId = dbUser.departmentId ?? null;
              token.plan = tenant.plan;
            }
          }
        }
      }

      // Refresh plan from DB on every request to catch SA plan changes immediately
      if (token.tenantId && token.role !== "SUPER_ADMIN") {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: token.tenantId as string },
            select: { plan: true },
          });
          if (tenant) {
            token.plan = tenant.plan;
          }
        } catch {
          // DB error — keep existing plan in token
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
