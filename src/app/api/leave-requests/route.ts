import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: userId, tenantId, role } = session.user;

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  const requests = await prisma.leaveRequest.findMany({
    where: isAdminOrApprover ? { tenantId } : { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, requests });
}

const createSchema = z.object({
  type: z.enum(["PAID", "HALF", "HOURLY", "ABSENCE"]),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: userId, tenantId } = session.user;

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const request = await prisma.leaveRequest.create({
    data: {
      tenantId,
      userId,
      type: input.data.type,
      startAt: new Date(input.data.startAt),
      endAt: new Date(input.data.endAt),
      reason: input.data.reason ?? null,
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: userId,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "LeaveRequest",
    entityId: request.id,
    after: { type: input.data.type, startAt: input.data.startAt, endAt: input.data.endAt },
  });

  return NextResponse.json({ ok: true, request });
}
