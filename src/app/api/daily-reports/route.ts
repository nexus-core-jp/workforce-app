import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isMonthClosed } from "@/lib/close";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { startOfJstDay } from "@/lib/time";

const upsertSchema = z.object({
  date: z.string().min(10),
  route: z.string().max(200).optional().nullable(),
  cases: z.number().int().min(0).optional().nullable(),
  workHoursText: z.string().max(100).optional().nullable(),
  incidentsText: z.string().max(1000).optional().nullable(),
  notesText: z.string().max(1000).optional().nullable(),
  announcementsText: z.string().max(1000).optional().nullable(),
  submit: z.boolean().optional(),
});

function parseJstDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const approx = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return startOfJstDay(approx);
}

/** POST: Create or update a daily report (save draft or submit) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => null);
  const input = upsertSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const date = parseJstDateOnly(input.data.date);
  const shouldSubmit = input.data.submit === true;

  if (await isMonthClosed(tenantId, date)) {
    return jsonError("この月は締め済みです", 409);
  }

  // Check if already submitted
  const existing = await prisma.dailyReport.findUnique({
    where: { tenantId_userId_date: { tenantId, userId, date } },
  });
  if (existing?.status === "SUBMITTED" && !shouldSubmit) {
    return jsonError("既に提出済みです", 409);
  }

  try {
    const report = await prisma.dailyReport.upsert({
      where: { tenantId_userId_date: { tenantId, userId, date } },
      create: {
        tenantId,
        userId,
        date,
        route: input.data.route ?? null,
        cases: input.data.cases ?? null,
        workHoursText: input.data.workHoursText ?? null,
        incidentsText: input.data.incidentsText ?? null,
        notesText: input.data.notesText ?? null,
        announcementsText: input.data.announcementsText ?? null,
        status: shouldSubmit ? "SUBMITTED" : "DRAFT",
        submittedAt: shouldSubmit ? new Date() : null,
      },
      update: {
        route: input.data.route ?? null,
        cases: input.data.cases ?? null,
        workHoursText: input.data.workHoursText ?? null,
        incidentsText: input.data.incidentsText ?? null,
        notesText: input.data.notesText ?? null,
        announcementsText: input.data.announcementsText ?? null,
        ...(shouldSubmit
          ? { status: "SUBMITTED", submittedAt: new Date() }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error("[daily-reports] DB error:", err);
    return jsonError("日報の保存に失敗しました。再度お試しください。", 500);
  }
}

/** GET: Fetch daily reports for the authenticated user */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId, role } = user;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  // Single report by date
  if (dateParam) {
    const date = parseJstDateOnly(dateParam);
    const report = await prisma.dailyReport.findUnique({
      where: { tenantId_userId_date: { tenantId, userId, date } },
    });
    return NextResponse.json({ ok: true, report: report ?? null });
  }

  // Admin/Approver can see all reports for the tenant
  const isAdmin = role === "ADMIN" || role === "APPROVER";
  const reports = await prisma.dailyReport.findMany({
    where: {
      tenantId,
      ...(isAdmin ? {} : { userId }),
    },
    orderBy: { date: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, reports });
}
