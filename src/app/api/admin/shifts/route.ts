import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { logger } from "@/lib/logger";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  plannedStart: z.string().regex(/^\d{2}:\d{2}$/),
  plannedEnd: z.string().regex(/^\d{2}:\d{2}$/),
  defaultBreakMinutes: z.number().int().min(0).max(480),
});

/** GET: list shift patterns */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const patterns = await prisma.shiftPattern.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, patterns });
}

/** POST: create shift pattern */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  // Check for duplicate name
  const existing = await prisma.shiftPattern.findUnique({
    where: { tenantId_name: { tenantId, name: input.data.name } },
  });
  if (existing) return jsonError("同名のシフトパターンが既に存在します", 409);

  const created = await prisma.shiftPattern.create({
    data: {
      tenantId,
      name: input.data.name,
      plannedStart: input.data.plannedStart,
      plannedEnd: input.data.plannedEnd,
      defaultBreakMinutes: input.data.defaultBreakMinutes,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: user.id,
      action: "SHIFT_PATTERN_CREATED",
      entityType: "ShiftPattern",
      entityId: created.id,
      afterJson: { name: input.data.name, plannedStart: input.data.plannedStart, plannedEnd: input.data.plannedEnd },
    },
  });

  return NextResponse.json({ ok: true, pattern: created });
}

/** DELETE: remove shift pattern */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return jsonError("Missing id");

  const pattern = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!pattern || pattern.tenantId !== tenantId) return jsonError("Not found", 404);

  await prisma.shiftPattern.delete({ where: { id } });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: user.id,
      action: "SHIFT_PATTERN_DELETED",
      entityType: "ShiftPattern",
      entityId: id,
      beforeJson: { name: pattern.name },
    },
  });

  return NextResponse.json({ ok: true });
}
