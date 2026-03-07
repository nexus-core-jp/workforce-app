import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: userId, tenantId, role } = session.user;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") ?? userId;

  // Non-admin can only see own balance
  if (targetUserId !== userId && role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const entries = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId: targetUserId },
    orderBy: { effectiveDate: "desc" },
    include: { request: { select: { type: true, startAt: true, endAt: true } } },
  });

  const balance = entries.reduce((sum, e) => {
    if (e.kind === "GRANT" || e.kind === "ADJUST") return sum + Number(e.days);
    return sum - Number(e.days);
  }, 0);

  return NextResponse.json({ ok: true, balance, entries });
}

function parseJstDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return startOfJstDay(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)));
}

const grantSchema = z.object({
  userId: z.string().min(1),
  kind: z.enum(["GRANT", "ADJUST"]),
  days: z.number().min(0.5),
  note: z.string().max(200).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: actorId, tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = grantSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const entry = await prisma.leaveLedgerEntry.create({
    data: {
      tenantId,
      userId: input.data.userId,
      kind: input.data.kind,
      days: input.data.days,
      note: input.data.note ?? null,
      effectiveDate: parseJstDate(input.data.effectiveDate),
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: actorId,
    action: `LEAVE_BALANCE_${input.data.kind}`,
    entityType: "LeaveLedgerEntry",
    entityId: entry.id,
    after: { userId: input.data.userId, kind: input.data.kind, days: input.data.days },
  });

  return NextResponse.json({ ok: true, entry });
}
