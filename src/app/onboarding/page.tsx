import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { OnboardingWizard } from "./OnboardingWizard";

/**
 * 初回ログイン後のテナント初期設定ガイド。
 * - ADMIN ロール専用
 * - 既に onboardingCompleted=true のテナントは /admin にリダイレクト
 * - ウィザード完了でフラグを true にして /admin に遷移
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { onboardingCompleted: true, name: true, slug: true },
  });

  if (!tenant) redirect("/login");
  if (tenant.onboardingCompleted) redirect("/admin");

  // Pre-fetch existing state so wizard can skip completed steps
  const [deptCount, memberCount, shiftCount, holidayCount] = await Promise.all([
    prisma.department.count({ where: { tenantId: user.tenantId } }),
    prisma.user.count({ where: { tenantId: user.tenantId, role: "EMPLOYEE" } }),
    prisma.shiftPattern.count({ where: { tenantId: user.tenantId } }),
    prisma.tenantHoliday.count({ where: { tenantId: user.tenantId } }),
  ]);

  return (
    <OnboardingWizard
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      initialProgress={{
        hasDepartments: deptCount > 0,
        hasMembers: memberCount > 0,
        hasShifts: shiftCount > 0,
        hasHolidays: holidayCount > 0,
      }}
    />
  );
}
