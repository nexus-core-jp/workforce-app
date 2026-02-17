import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: userId, tenantId, role } = session.user;
  const isAdmin = role === "ADMIN" || role === "APPROVER";

  const reports = await prisma.dailyReport.findMany({
    where: isAdmin ? { tenantId } : { tenantId, userId },
    orderBy: { date: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, reports });
}

const createSchema = z.object({
  date: z.string().min(10),
  route: z.string().max(200).optional(),
  cases: z.number().int().min(0).optional(),
  workHoursText: z.string().max(100).optional(),
  incidentsText: z.string().max(1000).optional(),
  notesText: z.string().max(1000).optional(),
  announcementsText: z.string().max(1000).optional(),
  submit: z.boolean().optional(),
});

function parseJstDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const approx = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return startOfJstDay(approx);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: userId, tenantId } = session.user;

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const date = parseJstDateOnly(input.data.date);
  const shouldSubmit = input.data.submit === true;

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
      ...(shouldSubmit ? { status: "SUBMITTED", submittedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ ok: true, report });
}
