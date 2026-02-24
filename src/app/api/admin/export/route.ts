import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { toSessionUser } from "@/lib/session";
import { formatLocal } from "@/lib/time";

const querySchema = z.object({
  type: z.enum(["attendance", "daily-reports"]),
  month: z.string().regex(/^\d{4}-\d{2}$/),
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

  const { tenantId, role } = user;
  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const raw = {
    type: url.searchParams.get("type"),
    month: url.searchParams.get("month"),
  };

  const input = querySchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const { type, month } = input.data;
  const dateRange = monthRange(month);

  if (type === "attendance") {
    const entries = await prisma.timeEntry.findMany({
      where: { tenantId, date: dateRange },
      orderBy: [{ date: "asc" }, { userId: "asc" }],
      include: { user: { select: { name: true, email: true } } },
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
