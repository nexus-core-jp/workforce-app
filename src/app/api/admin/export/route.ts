import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { rateLimit } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/session";
import { formatLocal } from "@/lib/time";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  type: z.enum(["attendance", "daily-reports", "members", "corrections", "leave-requests", "leave-balance", "audit-logs"]),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  // Start: 1st of month 00:00 JST  →  previous day 15:00 UTC
  const start = new Date(Date.UTC(y, m - 1, 1) - 9 * 60 * 60 * 1000);
  // End: 1st of next month 00:00 JST
  const end = new Date(Date.UTC(y, m, 1) - 9 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: actorId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  // Rate limit: 10 exports per user per hour
  const { limited } = await rateLimit(`export:${actorId}`, 10, 60 * 60 * 1000);
  if (limited) return jsonError("エクスポートの上限に達しました。しばらくお待ちください。", 429);

  const url = new URL(req.url);
  const raw = {
    type: url.searchParams.get("type"),
    month: url.searchParams.get("month"),
  };

  const input = querySchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const { type, month } = input.data;

  // --- Types that don't require month ---
  if (type === "members") {
    const members = await prisma.user.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: { department: { select: { name: true } } },
    });
    const headers = ["名前", "メール", "ロール", "部署", "有効", "登録日"];
    const roleLabels: Record<string, string> = { EMPLOYEE: "社員", ADMIN: "管理者", SUPER_ADMIN: "スーパー管理者" };
    const rows = members.map((m) => [
      m.name ?? "",
      m.email,
      roleLabels[m.role] ?? m.role,
      m.department?.name ?? "",
      m.active ? "有効" : "無効",
      formatLocal(m.createdAt),
    ]);
    const csv = toCsv(headers, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="members.csv"`,
      },
    });
  }

  if (type === "leave-balance") {
    const ledger = await prisma.leaveLedgerEntry.findMany({
      where: { tenantId },
      orderBy: [{ userId: "asc" }, { effectiveDate: "asc" }],
      include: { user: { select: { name: true, email: true } } },
    });
    const headers = ["社員名", "メール", "種別", "日数", "有効日", "備考"];
    const kindLabels: Record<string, string> = { GRANT: "付与", ADJUST: "調整", USE: "使用" };
    const rows = ledger.map((l) => [
      l.user.name ?? "",
      l.user.email,
      kindLabels[l.kind] ?? l.kind,
      Number(l.days),
      formatLocal(l.effectiveDate).split(" ")[0],
      l.note ?? "",
    ]);
    const csv = toCsv(headers, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leave_balance.csv"`,
      },
    });
  }

  // --- Types that require month ---
  if (!month) return jsonError("monthパラメータが必要です");
  const dateRange = monthRange(month);

  // Audit log: track who exported what
  prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actorId,
      action: "DATA_EXPORTED",
      entityType: "Export",
      entityId: `${type}_${month}`,
      afterJson: { type, month },
    },
  }).catch((err) => logger.error("audit.write_failed", {}, err));

  const MAX_EXPORT_ROWS = 10000;

  if (type === "attendance") {
    const entries = await prisma.timeEntry.findMany({
      where: { tenantId, date: dateRange },
      orderBy: [{ date: "asc" }, { userId: "asc" }],
      include: { user: { select: { name: true, email: true } } },
      take: MAX_EXPORT_ROWS,
    });

    const headers = [
      "日付", "社員名", "メール", "出勤", "退勤",
      "休憩開始", "休憩終了", "労働時間(分)", "ステータス",
    ];
    const rows = entries.map((e) => [
      formatLocal(e.date).split(" ")[0],
      e.user.name ?? "",
      e.user.email,
      formatLocal(e.clockInAt),
      formatLocal(e.clockOutAt),
      formatLocal(e.breakStartAt),
      formatLocal(e.breakEndAt),
      e.workMinutes,
      e.status,
    ]);

    const csv = toCsv(headers, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance_${month}.csv"`,
      },
    });
  }

  // daily-reports
  const reports = await prisma.dailyReport.findMany({
    where: { tenantId, date: dateRange },
    orderBy: [{ date: "asc" }, { userId: "asc" }],
    include: { user: { select: { name: true, email: true } } },
    take: MAX_EXPORT_ROWS,
  });

  const headers = [
    "日付", "社員名", "メール", "ルート", "対応件数",
    "勤務時間", "インシデント", "備考", "連絡事項",
    "ステータス", "提出日時",
  ];
  const rows = reports.map((r) => [
    formatLocal(r.date).split(" ")[0],
    r.user.name ?? "",
    r.user.email,
    r.route ?? "",
    r.cases ?? "",
    r.workHoursText ?? "",
    r.incidentsText ?? "",
    r.notesText ?? "",
    r.announcementsText ?? "",
    r.status,
    formatLocal(r.submittedAt),
  ]);

  const csv = toCsv(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daily_reports_${month}.csv"`,
    },
  });
}
