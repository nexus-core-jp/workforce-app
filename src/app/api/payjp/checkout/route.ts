import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPayjp } from "@/lib/payjp";
import { toSessionUser } from "@/lib/session";
import { logger } from "@/lib/logger";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const token = body.token as string | undefined;

  if (!token) {
    return jsonError("カードトークンが必要です");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, payjpCustomerId: true, plan: true },
  });
  if (!tenant) return jsonError("Tenant not found", 404);

  try {
    const payjp = getPayjp();

    let customerId = tenant.payjpCustomerId;

    if (!customerId) {
      const customer = await payjp.customers.create({
        card: token,
        description: `${tenant.name} (${tenant.id})`,
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { payjpCustomerId: customerId },
      });
    } else {
      // Update card for existing customer
      await payjp.customers.update(customerId, { card: token });
    }

    // Create subscription
    const planId = process.env.PAYJP_PLAN_ID;
    if (!planId) return jsonError("PAYJP_PLAN_ID is not configured", 500);

    const subscription = await payjp.subscriptions.create({
      customer: customerId,
      plan: planId,
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        plan: "ACTIVE",
        paymentMethod: "PAYJP",
        payjpSubscriptionId: subscription.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: "PAYJP_SUBSCRIPTION_CREATED",
        entityType: "Tenant",
        entityId: tenant.id,
        afterJson: {
          plan: "ACTIVE",
          subscriptionId: subscription.id,
          paymentMethod: "PAYJP",
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[payjp-checkout] error", {}, err);
    return jsonError("決済処理に失敗しました。カード情報をご確認ください。", 500);
  }
}
