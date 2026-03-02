import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { createNotification } from "@/lib/notify";

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

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: approverUserId, role } = user;

  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

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

  const decidedAt = new Date();

  // Wrap all state mutations in a single transaction for data integrity
  if (input.data.decision === "APPROVED" && (request.type === "PAID" || request.type === "HALF")) {
    let leaveDays = 1;
    if (request.type === "HALF") {
      leaveDays = 0.5;
    } else {
      const days = Math.ceil(
        (request.endAt.getTime() - request.startAt.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      leaveDays = days;
    }

    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", approverUserId, decidedAt },
      }),
      prisma.leaveLedgerEntry.create({
        data: {
          tenantId,
          userId: request.userId,
          requestId: request.id,
          kind: "USE",
          days: leaveDays,
          note: `${request.type === "HALF" ? "半休" : "有休"} ${leaveDays}日`,
          effectiveDate: request.startAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: approverUserId,
          action: "LEAVE_APPROVED",
          entityType: "LeaveRequest",
          entityId: request.id,
          beforeJson: Prisma.JsonNull,
          afterJson: { type: request.type, leaveDays, userId: request.userId },
        },
      }),
    ]);
  } else if (input.data.decision === "APPROVED") {
    // APPROVED but not PAID/HALF -- no ledger deduction
    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", approverUserId, decidedAt },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: approverUserId,
          action: "LEAVE_APPROVED",
          entityType: "LeaveRequest",
          entityId: request.id,
          beforeJson: Prisma.JsonNull,
          afterJson: { type: request.type, userId: request.userId },
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", approverUserId, decidedAt },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: approverUserId,
          action: "LEAVE_REJECTED",
          entityType: "LeaveRequest",
          entityId: request.id,
          beforeJson: Prisma.JsonNull,
          afterJson: { type: request.type, reason: request.reason, decision: "REJECTED" },
        },
      }),
    ]);
  }

  // Also write via audit library
  await writeAuditLog({
    tenantId,
    actorUserId: approverUserId,
    action: `LEAVE_${input.data.decision}`,
    entityType: "LeaveRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: input.data.decision },
  });

  // Notify the requester
  const TYPE_LABELS: Record<string, string> = { PAID: "有給休暇", HALF: "半休", HOURLY: "時間休", ABSENCE: "欠勤" };
  const typeLabel = TYPE_LABELS[request.type] ?? request.type;
  const decisionLabel = input.data.decision === "APPROVED" ? "承認" : "却下";
  await createNotification({
    tenantId,
    userId: request.userId,
    type: input.data.decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    title: `${typeLabel}申請が${decisionLabel}されました`,
    message: `${request.startAt.toISOString().slice(0, 10)} の${typeLabel}申請が${decisionLabel}されました。`,
    link: "/leave-requests",
  });

  return NextResponse.json({ ok: true });
}
