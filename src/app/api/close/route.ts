import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toCloseMonth } from "@/lib/jst";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: closedByUserId, tenantId, role } = session.user;

  if (!tenantId || !closedByUserId) return jsonError("Invalid session", 401);
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

  await writeAuditLog({
    tenantId,
    actorUserId: closedByUserId,
    action: "MONTH_CLOSED",
    entityType: "Close",
    entityId: close.id,
    after: { month, scope: "COMPANY" },
  });

  return NextResponse.json({ ok: true, close });
}
