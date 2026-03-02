import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { notifyAdmins } from "@/lib/notify";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const createSchema = z.object({
  type: z.enum(["PAID", "HALF", "HOURLY", "ABSENCE"]),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reason: z.string().max(500).optional(),
});

/** GET: list leave requests (own for users, all for admin/approver) */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId, role } = user;

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  const requests = await prisma.leaveRequest.findMany({
    where: isAdminOrApprover ? { tenantId } : { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  // Leave balance: sum of GRANT/ADJUST - USE
  const ledger = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId },
  });

  let balance = 0;
  for (const entry of ledger) {
    const days = Number(entry.days);
    if (entry.kind === "USE") {
      balance -= days;
    } else {
      balance += days;
    }
  }

  return NextResponse.json({ ok: true, requests, balance });
}

/** POST: create leave request */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const startAt = new Date(input.data.startAt);
  const endAt = new Date(input.data.endAt);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return jsonError("Invalid date");
  }
  if (endAt < startAt) {
    return jsonError("終了日は開始日以降にしてください");
  }

  // Calculate leave days
  let leaveDays = 1;
  if (input.data.type === "HALF") {
    leaveDays = 0.5;
  } else if (input.data.type === "HOURLY") {
    leaveDays = 0; // hourly leave doesn't consume full days from balance
  } else if (input.data.type !== "ABSENCE") {
    // PAID: count business days
    const days = Math.ceil(
      (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    leaveDays = days;
  }

  // Use transaction to prevent race condition on balance check + creation
  const created = await prisma.$transaction(async (tx) => {
    // Check balance for PAID/HALF leave
    if (input.data.type === "PAID" || input.data.type === "HALF") {
      const ledger = await tx.leaveLedgerEntry.findMany({
        where: { tenantId, userId },
      });
      let balance = 0;
      for (const entry of ledger) {
        const d = Number(entry.days);
        if (entry.kind === "USE") {
          balance -= d;
        } else {
          balance += d;
        }
      }
      if (balance < leaveDays) {
        throw new Error(`有休残日数が不足しています（残: ${balance}日, 必要: ${leaveDays}日）`);
      }
    }

    return tx.leaveRequest.create({
      data: {
        tenantId,
        userId,
        type: input.data.type,
        startAt,
        endAt,
        reason: input.data.reason ?? "",
        status: "PENDING",
      },
    });
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message.includes("有休残日数")) {
      return { error: e.message } as const;
    }
    throw e;
  });

  if ("error" in created) {
    return jsonError(created.error);
  }

  // Write audit log via audit library
  await writeAuditLog({
    tenantId,
    actorUserId: userId,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "LeaveRequest",
    entityId: created.id,
    after: { type: input.data.type, startAt: input.data.startAt, endAt: input.data.endAt },
  });

  // Notify admins/approvers
  const TYPE_LABELS: Record<string, string> = { PAID: "有給休暇", HALF: "半休", HOURLY: "時間休", ABSENCE: "欠勤" };
  const typeLabel = TYPE_LABELS[input.data.type] ?? input.data.type;
  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const requesterName = requester?.name ?? requester?.email ?? "ユーザー";
  await notifyAdmins(
    tenantId,
    "LEAVE_REQUESTED",
    `${requesterName}さんから${typeLabel}申請`,
    `${requesterName}さんが${startAt.toISOString().slice(0, 10)}の${typeLabel}を申請しました。`,
    "/admin",
  );

  return NextResponse.json({ ok: true, request: created });
}
