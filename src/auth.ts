import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const signInSchema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
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
      if (user) {
        token.sub = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.departmentId = token.departmentId;
      return session;
    },
  },
});
