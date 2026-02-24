import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { diffMinutes } from "@/lib/time";

const schema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: approverUserId, role } = user;

  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const correction = await prisma.attendanceCorrection.findUnique({ where: { id: input.data.id } });
  if (!correction || correction.tenantId !== tenantId) return jsonError("Not found", 404);
  if (correction.status !== "PENDING") return jsonError("Already decided", 409);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCorrection = await tx.attendanceCorrection.update({
      where: { id: correction.id },
      data: {
        status: input.data.decision,
        approverUserId,
        decidedAt: new Date(),
      },
    });

    // When approved, apply the requested times to the TimeEntry
    if (input.data.decision === "APPROVED") {
      const entry = await tx.timeEntry.findUnique({
        where: {
          tenantId_userId_date: {
            tenantId: correction.tenantId,
            userId: correction.userId,
            date: correction.date,
          },
        },
      });

      if (entry) {
        const beforeSnapshot = {
          clockInAt: entry.clockInAt,
          clockOutAt: entry.clockOutAt,
          breakStartAt: entry.breakStartAt,
          breakEndAt: entry.breakEndAt,
          workMinutes: entry.workMinutes,
        };

        const newClockInAt = correction.requestedClockInAt ?? entry.clockInAt;
        const newClockOutAt = correction.requestedClockOutAt ?? entry.clockOutAt;
        const newBreakStartAt = correction.requestedBreakStartAt ?? entry.breakStartAt;
        const newBreakEndAt = correction.requestedBreakEndAt ?? entry.breakEndAt;

        let workMinutes = 0;
        if (newClockInAt && newClockOutAt) {
          const total = diffMinutes(newClockInAt, newClockOutAt);
          let breakMin = 0;
          if (newBreakStartAt && newBreakEndAt) {
            breakMin = Math.max(0, diffMinutes(newBreakStartAt, newBreakEndAt));
          }
          workMinutes = Math.max(0, total - breakMin);
        }

        const updatedEntry = await tx.timeEntry.update({
          where: { id: entry.id },
          data: {
            clockInAt: newClockInAt,
            clockOutAt: newClockOutAt,
            breakStartAt: newBreakStartAt,
            breakEndAt: newBreakEndAt,
            workMinutes,
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            actorUserId: approverUserId,
            action: "CORRECTION_APPROVED",
            entityType: "TimeEntry",
            entityId: entry.id,
            beforeJson: beforeSnapshot,
            afterJson: {
              clockInAt: updatedEntry.clockInAt,
              clockOutAt: updatedEntry.clockOutAt,
              breakStartAt: updatedEntry.breakStartAt,
              breakEndAt: updatedEntry.breakEndAt,
              workMinutes: updatedEntry.workMinutes,
              correctionId: correction.id,
            },
          },
        });
      }
    } else {
      // Audit log for rejection
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: approverUserId,
          action: "CORRECTION_REJECTED",
          entityType: "AttendanceCorrection",
          entityId: correction.id,
          beforeJson: Prisma.JsonNull,
          afterJson: { reason: correction.reason, decision: "REJECTED" },
        },
      });
    }

    return updatedCorrection;
  });

  return NextResponse.json({ ok: true, correction: updated });
}
