import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const addSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1, "名称は必須です").max(100),
  recurring: z.boolean().default(false),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

/** GET: List company holidays for the tenant */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = user;
  const url = new URL(req.url);
  const year = url.searchParams.get("year");

  let where: { tenantId: string; date?: { gte: Date; lt: Date } } = { tenantId };
  if (year) {
    const y = parseInt(year, 10);
    where = {
      tenantId,
      date: {
        gte: new Date(Date.UTC(y, 0, 1) - JST_OFFSET_MS),
        lt: new Date(Date.UTC(y + 1, 0, 1) - JST_OFFSET_MS),
      },
    };
  }

  const holidays = await prisma.tenantHoliday.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    ok: true,
    holidays: holidays.map((h) => ({
      id: h.id,
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(h.date),
      name: h.name,
      recurring: h.recurring,
    })),
  });
}

/** POST: Add a company holiday */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const actor = toSessionUser(session.user as Record<string, unknown>);
  if (!actor || actor.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = actor;

  const raw = await req.json().catch(() => null);
  const input = addSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  const { date, name, recurring } = input.data;

  // Convert date string to JST midnight stored as UTC
  const [y, m, d] = date.split("-").map(Number);
  const dateUtc = new Date(Date.UTC(y, m - 1, d) - JST_OFFSET_MS);

  // Check for duplicate
  const existing = await prisma.tenantHoliday.findUnique({
    where: { tenantId_date: { tenantId, date: dateUtc } },
  });
  if (existing) return jsonError("この日付は既に登録されています", 409);

  const holiday = await prisma.tenantHoliday.create({
    data: { tenantId, date: dateUtc, name, recurring },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.id,
      action: "COMPANY_HOLIDAY_ADDED",
      entityType: "TenantHoliday",
      entityId: holiday.id,
      afterJson: { date, name, recurring },
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE: Remove a company holiday */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const actor = toSessionUser(session.user as Record<string, unknown>);
  if (!actor || actor.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = actor;

  const raw = await req.json().catch(() => null);
  const input = deleteSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  const holiday = await prisma.tenantHoliday.findUnique({ where: { id: input.data.id } });
  if (!holiday || holiday.tenantId !== tenantId) return jsonError("見つかりません", 404);

  await prisma.tenantHoliday.delete({ where: { id: input.data.id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.id,
      action: "COMPANY_HOLIDAY_DELETED",
      entityType: "TenantHoliday",
      entityId: input.data.id,
      beforeJson: { name: holiday.name },
    },
  });

  return NextResponse.json({ ok: true });
}
