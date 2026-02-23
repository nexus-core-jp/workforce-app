import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const signInSchema = z.object({
  tenant: z.string().min(1), // tenant slug
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

        const dbTenant = await prisma.tenant.findUnique({ where: { slug: tenant } });
        if (!dbTenant) return null;

        const user = await prisma.user.findUnique({
          where: { tenantId_email: { tenantId: dbTenant.id, email } },
        });
        if (!user?.active) return null;
        if (!user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Return user data; custom fields are forwarded via jwt/session callbacks.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, `user` is set (from Credentials.authorize).
      if (user) {
        const u = user as Record<string, unknown>;
        token.sub = u.id as string;
        token.tenantId = u.tenantId as string;
        token.role = u.role as string;
        token.departmentId = (u.departmentId as string) ?? null;
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
      return session;
    },
  },
});
