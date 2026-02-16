import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: approverUserId, tenantId, role } = session.user;

  if (!tenantId || !approverUserId) return jsonError("Invalid session", 401);
  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const correction = await prisma.attendanceCorrection.findUnique({ where: { id: input.data.id } });
  if (!correction || correction.tenantId !== tenantId) return jsonError("Not found", 404);
  if (correction.status !== "PENDING") return jsonError("Already decided", 409);

  // Prevent self-approval
  if (correction.userId === approverUserId) {
    return jsonError("Cannot approve your own correction request", 403);
  }

  const updated = await prisma.attendanceCorrection.update({
    where: { id: correction.id },
    data: {
      status: input.data.decision,
      approverUserId,
      decidedAt: new Date(),
    },
  });

  // Apply approved corrections to TimeEntry
  if (input.data.decision === "APPROVED") {
    const updateData: Record<string, Date | null> = {};
    if (correction.requestedClockInAt) updateData.clockInAt = correction.requestedClockInAt;
    if (correction.requestedClockOutAt) updateData.clockOutAt = correction.requestedClockOutAt;
    if (correction.requestedBreakStartAt) updateData.breakStartAt = correction.requestedBreakStartAt;
    if (correction.requestedBreakEndAt) updateData.breakEndAt = correction.requestedBreakEndAt;

    if (Object.keys(updateData).length > 0) {
      await prisma.timeEntry.updateMany({
        where: { tenantId, userId: correction.userId, date: correction.date },
        data: updateData,
      });
    }
  }

  await writeAuditLog({
    tenantId,
    actorUserId: approverUserId,
    action: `CORRECTION_${input.data.decision}`,
    entityType: "AttendanceCorrection",
    entityId: correction.id,
    before: { status: correction.status },
    after: { status: input.data.decision, approverUserId },
  });

  return NextResponse.json({ ok: true, correction: updated });
}
