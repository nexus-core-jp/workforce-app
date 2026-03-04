import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const createSchema = z.object({
  userId: z.string().min(1),
  shiftPatternId: z.string().min(1),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
});

/** GET: list shift assignments */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const month = req.nextUrl.searchParams.get("month");

  const where: Record<string, unknown> = { tenantId };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    where.startDate = { lte: end };
    where.endDate = { gte: start };
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      shiftPattern: true,
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ ok: true, assignments });
}

/** POST: create shift assignment */
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

  // Verify user and pattern belong to tenant
  const [targetUser, pattern] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.data.userId } }),
    prisma.shiftPattern.findUnique({ where: { id: input.data.shiftPatternId } }),
  ]);

  if (!targetUser || targetUser.tenantId !== tenantId) return jsonError("User not found", 404);
  if (!pattern || pattern.tenantId !== tenantId) return jsonError("Shift pattern not found", 404);

  const startDate = new Date(input.data.startDate + "T00:00:00+09:00");
  const endDate = new Date(input.data.endDate + "T00:00:00+09:00");

  if (endDate < startDate) return jsonError("終了日は開始日以降にしてください");

  // Check for overlapping assignments
  const overlap = await prisma.shiftAssignment.findFirst({
    where: {
      tenantId,
      userId: input.data.userId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlap) return jsonError("指定期間に既存のシフト割当が重複しています", 409);

  const created = await prisma.shiftAssignment.create({
    data: {
      tenantId,
      userId: input.data.userId,
      shiftPatternId: input.data.shiftPatternId,
      startDate,
      endDate,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: user.id,
      action: "SHIFT_ASSIGNMENT_CREATED",
      entityType: "ShiftAssignment",
      entityId: created.id,
      afterJson: { userId: input.data.userId, shiftPatternId: input.data.shiftPatternId, startDate: input.data.startDate, endDate: input.data.endDate },
    },
  });

  return NextResponse.json({ ok: true, assignment: created });
}

/** DELETE: remove shift assignment */
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

  const assignment = await prisma.shiftAssignment.findUnique({ where: { id } });
  if (!assignment || assignment.tenantId !== tenantId) return jsonError("Not found", 404);

  await prisma.shiftAssignment.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: user.id,
      action: "SHIFT_ASSIGNMENT_DELETED",
      entityType: "ShiftAssignment",
      entityId: id,
      beforeJson: { userId: assignment.userId, startDate: assignment.startDate, endDate: assignment.endDate },
    },
  });

  return NextResponse.json({ ok: true });
}
