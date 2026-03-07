import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** POST: Confirm payment for an invoice (super admin only) */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "SUPER_ADMIN") return jsonError("Forbidden", 403);

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return jsonError("Invoice not found", 404);
  if (invoice.status !== "PENDING") {
    return jsonError("この請求書は既に処理済みです");
  }

  const now = new Date();

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: "PAID",
      paidAt: now,
      confirmedByUserId: user.id,
    },
  });

  // Activate the tenant
  await prisma.tenant.update({
    where: { id: invoice.tenantId },
    data: { plan: "ACTIVE" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: invoice.tenantId,
      actorUserId: user.id,
      action: "BANK_TRANSFER_CONFIRMED",
      entityType: "Invoice",
      entityId: id,
      afterJson: { plan: "ACTIVE", paidAt: now.toISOString(), amount: invoice.amount },
    },
  });

  return NextResponse.json({ ok: true, invoice: updated });
}
