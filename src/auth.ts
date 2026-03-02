import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { LineProvider } from "@/lib/line-provider";

const signInSchema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter is removed: Credentials provider + JWT sessions don't need
  // a database adapter. We handle user lookup directly in authorize().
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        tenant: { label: "Tenant", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const { tenant, email, password } = signInSchema.parse(raw);

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
          }).catch((err) => console.error("[audit]", err));
          return null;
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
        }).catch((err) => console.error("[audit]", err));

        // Return user data; custom fields are forwarded via jwt/session callbacks.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
          departmentId: user.departmentId,
          plan: dbTenant.plan,
          trialEndsAt: dbTenant.trialEndsAt?.toISOString() ?? null,
        };
      },
    }),
    // LINE Login — active only when LINE_CLIENT_ID / LINE_CLIENT_SECRET are set
    ...(process.env.LINE_CLIENT_ID ? [LineProvider()] : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
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
