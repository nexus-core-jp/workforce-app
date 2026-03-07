import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** POST: Request bank transfer invoice */
export async function POST() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, plan: true },
  });
  if (!tenant) return jsonError("Tenant not found", 404);

  // Check for existing pending invoice
  const existing = await prisma.invoice.findFirst({
    where: { tenantId: tenant.id, status: "PENDING" },
  });
  if (existing) {
    return jsonError("未払いの請求書が既にあります。入金確認後に新しい請求書を発行できます。");
  }

  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const dueDate = new Date(periodEnd);
  dueDate.setDate(dueDate.getDate() + 14); // 14 days after period end

  const MONTHLY_AMOUNT = 5000; // ¥5,000/month

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      amount: MONTHLY_AMOUNT,
      periodStart,
      periodEnd,
      dueDate,
      status: "PENDING",
    },
  });

  // Update tenant payment method
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { paymentMethod: "BANK_TRANSFER" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: user.id,
      action: "BANK_TRANSFER_INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      afterJson: { amount: MONTHLY_AMOUNT, dueDate: dueDate.toISOString() },
    },
  });

  return NextResponse.json({ ok: true, invoice });
}
