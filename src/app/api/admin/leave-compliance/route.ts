/**
 * GET /api/admin/leave-compliance
 *   全アクティブ社員の「年5日取得義務」ステータスを返す。
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeComplianceStatus } from "@/lib/leave-grant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId } = session.user;

  const [users, ledger] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, active: true, retiredAt: null },
      select: { id: true, name: true, email: true },
    }),
    prisma.leaveLedgerEntry.findMany({
      where: { tenantId, kind: { in: ["GRANT", "USE"] } },
      select: { userId: true, kind: true, days: true, effectiveDate: true },
    }),
  ]);

  const statuses = users.map((u) => {
    const grants = ledger
      .filter((e) => e.userId === u.id && e.kind === "GRANT")
      .map((e) => ({ days: Number(e.days), effectiveDate: e.effectiveDate }));
    const uses = ledger
      .filter((e) => e.userId === u.id && e.kind === "USE")
      .map((e) => ({ days: Number(e.days), effectiveDate: e.effectiveDate }));

    const status = computeComplianceStatus(u.id, grants, uses);
    return {
      ...status,
      userId: u.id,
      userLabel: u.name ?? u.email,
      grantDate: status.grantDate?.toISOString() ?? null,
      deadline: status.deadline?.toISOString() ?? null,
    };
  });

  // Filter by level for quicker consumption
  const violations = statuses.filter((s) => s.level === "violation");
  const warnings = statuses.filter((s) => s.level === "warning");

  return NextResponse.json({
    ok: true,
    statuses,
    summary: {
      total: statuses.length,
      violations: violations.length,
      warnings: warnings.length,
    },
  });
}
