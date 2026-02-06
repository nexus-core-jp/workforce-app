import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const signInSchema = z.object({
  tenant: z.string().min(1), // tenant slug
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials provider requires JWT sessions (Auth.js limitation)
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

        // next-auth expects a plain object with an id.
        // We'll stash app-specific fields into the JWT via callbacks.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
          departmentId: user.departmentId,
        } as any;
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
        token.sub = (user as any).id;
        (token as any).tenantId = (user as any).tenantId;
        (token as any).role = (user as any).role;
        (token as any).departmentId = (user as any).departmentId;
      }
      return token;
    },
    async session({ session, token }) {
      // expose claims to the client
      (session.user as any).id = token.sub;
      (session.user as any).tenantId = (token as any).tenantId;
      (session.user as any).role = (token as any).role;
      (session.user as any).departmentId = (token as any).departmentId;
      return session;
    },
  },
});
