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

  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const request = await prisma.leaveRequest.findUnique({ where: { id: input.data.id } });
  if (!request || request.tenantId !== tenantId) return jsonError("Not found", 404);
  if (request.status !== "PENDING") return jsonError("Already decided", 409);

  // Prevent self-approval
  if (request.userId === approverUserId) {
    return jsonError("Cannot approve your own leave request", 403);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status: input.data.decision,
      approverUserId,
      decidedAt: new Date(),
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: approverUserId,
    action: `LEAVE_${input.data.decision}`,
    entityType: "LeaveRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: input.data.decision },
  });

  return NextResponse.json({ ok: true, request: updated });
}
