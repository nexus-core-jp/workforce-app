/**
 * POST /api/admin/leave-grant
 *   全社員の年次有給を対象に、今日時点で付与タイミングに達している
 *   ユーザーに対し GRANT エントリーを冪等に作成する。
 *
 * GET /api/admin/leave-grant
 *   dry-run — 作成せずに付与予定だけ返す(プレビュー用)。
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { computeDuePlans } from "@/lib/leave-grant";

function forbidden() {
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return null;
  return session.user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return forbidden();

  const [users, grants] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, active: true, retiredAt: null },
      select: { id: true, name: true, email: true, hireDate: true, retiredAt: true },
    }),
    prisma.leaveLedgerEntry.findMany({
      where: { tenantId: user.tenantId, kind: "GRANT" },
      select: { userId: true, effectiveDate: true, days: true },
    }),
  ]);

  const plans = computeDuePlans(
    users.map((u) => ({ id: u.id, hireDate: u.hireDate, retiredAt: u.retiredAt })),
    grants.map((g) => ({ userId: g.userId, effectiveDate: g.effectiveDate, days: Number(g.days) })),
  );

  const usersById = new Map(users.map((u) => [u.id, u]));
  const preview = plans.map((p) => {
    const u = usersById.get(p.userId);
    return {
      userId: p.userId,
      userLabel: u?.name ?? u?.email ?? p.userId,
      days: p.days,
      effectiveDate: p.effectiveDate.toISOString(),
      reason: p.reason,
    };
  });

  return NextResponse.json({ ok: true, plans: preview });
}

export async function POST() {
  const user = await requireAdmin();
  if (!user) return forbidden();

  const [users, grants] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, active: true, retiredAt: null },
      select: { id: true, hireDate: true, retiredAt: true },
    }),
    prisma.leaveLedgerEntry.findMany({
      where: { tenantId: user.tenantId, kind: "GRANT" },
      select: { userId: true, effectiveDate: true, days: true },
    }),
  ]);

  const plans = computeDuePlans(
    users,
    grants.map((g) => ({ userId: g.userId, effectiveDate: g.effectiveDate, days: Number(g.days) })),
  );

  if (plans.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: "付与対象者はいません" });
  }

  const created = await prisma.$transaction(
    plans.map((p) =>
      prisma.leaveLedgerEntry.create({
        data: {
          tenantId: user.tenantId,
          userId: p.userId,
          kind: "GRANT",
          days: p.days,
          note: p.reason,
          effectiveDate: p.effectiveDate,
        },
      }),
    ),
  );

  await writeAuditLog({
    tenantId: user.tenantId,
    actorUserId: user.id,
    action: "LEAVE_AUTO_GRANT",
    entityType: "LeaveLedgerEntry",
    entityId: "bulk",
    after: { count: created.length, totalDays: plans.reduce((s, p) => s + p.days, 0) },
  });

  return NextResponse.json({ ok: true, created: created.length });
}
