import { NextResponse } from "next/server";
import { z } from "zod";

import { ERROR_MESSAGES } from "@/lib/constants";
import { jsonError, requireRole } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

const schema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
  const result = await requireRole("ADMIN", "APPROVER");
  if (!result.ok) return result.response;
  const { id: approverUserId, tenantId } = result.user;

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(ERROR_MESSAGES.INVALID_INPUT);

  const correction = await prisma.attendanceCorrection.findUnique({ where: { id: input.data.id } });
  if (!correction || correction.tenantId !== tenantId) return jsonError(ERROR_MESSAGES.NOT_FOUND, 404);
  if (correction.status !== "PENDING") return jsonError(ERROR_MESSAGES.ALREADY_DECIDED, 409);

  const updated = await prisma.attendanceCorrection.update({
    where: { id: correction.id },
    data: {
      status: input.data.decision,
      approverUserId,
      decidedAt: new Date(),
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: approverUserId,
    action: `CORRECTION_${input.data.decision}`,
    entityType: "AttendanceCorrection",
    entityId: updated.id,
    beforeJson: correction,
    afterJson: updated,
  });

  return NextResponse.json({ ok: true, correction: updated });
}
