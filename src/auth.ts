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
  session: { strategy: "database" },
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
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      // attach app-specific user fields
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (dbUser) {
        (session.user as any).id = dbUser.id;
        (session.user as any).tenantId = dbUser.tenantId;
        (session.user as any).role = dbUser.role;
        (session.user as any).departmentId = dbUser.departmentId;
      }
      return session;
    },
  },
});
