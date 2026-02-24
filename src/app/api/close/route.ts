import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { toCloseMonth } from "@/lib/jst";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: closedByUserId, role } = user;

  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => ({}));
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const month = input.data.month ?? toCloseMonth(new Date());

  const close = await prisma.close.upsert({
    where: { tenantId_month_scope_departmentId: { tenantId, month, scope: "COMPANY", departmentId: "" } },
    create: { tenantId, month, scope: "COMPANY", departmentId: "", closedByUserId },
    update: {},
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: closedByUserId,
      action: "MONTH_CLOSED",
      entityType: "Close",
      entityId: close.id,
      beforeJson: Prisma.JsonNull,
      afterJson: { month, scope: "COMPANY" },
    },
  });

  return NextResponse.json({ ok: true, close });
}
