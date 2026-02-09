import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireRole } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toCloseMonth } from "@/lib/jst";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const result = await requireRole("ADMIN");
  if (!result.ok) return result.response;
  const { id: closedByUserId, tenantId } = result.user;

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
    action: "MONTHLY_CLOSE",
    entityType: "Close",
    entityId: close.id,
    afterJson: close,
  });

  return NextResponse.json({ ok: true, close });
}
