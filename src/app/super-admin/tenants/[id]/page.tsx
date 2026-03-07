import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { TenantDetail } from "./TenantDetail";

type Props = { params: Promise<{ id: string }> };

export default async function TenantDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
    },
  });

  if (!tenant) redirect("/super-admin");

  return (
    <TenantDetail
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        paymentMethod: tenant.paymentMethod,
        trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
        createdAt: tenant.createdAt.toISOString(),
      }}
      users={tenant.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
