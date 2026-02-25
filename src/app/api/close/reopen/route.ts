import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { toCloseMonth } from "@/lib/jst";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

/** POST: reopen a closed month */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: actorUserId, role } = user;

  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => ({}));
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const month = input.data.month ?? toCloseMonth(new Date());

  const close = await prisma.close.findUnique({
    where: { tenantId_month_scope_departmentId: { tenantId, month, scope: "COMPANY", departmentId: "" } },
  });

  if (!close) return jsonError("この月は締められていません", 404);

  await prisma.close.delete({ where: { id: close.id } });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action: "MONTH_REOPENED",
      entityType: "Close",
      entityId: close.id,
      beforeJson: { month, scope: "COMPANY" },
      afterJson: Prisma.JsonNull,
    },
  });

  return NextResponse.json({ ok: true });
}
