import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const body = await request.text();

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // PAY.JP webhook events
  const type = event.type as string;
  const data = event.data as Record<string, unknown> | undefined;

  if (!type || !data) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  try {
    switch (type) {
      case "subscription.renewed":
      case "charge.succeeded": {
        const customerId = data.customer as string | undefined;
        if (!customerId) break;

        const tenant = await prisma.tenant.findUnique({
          where: { payjpCustomerId: customerId },
          select: { id: true, plan: true },
        });
        if (!tenant) break;

        if (tenant.plan !== "ACTIVE") {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: "ACTIVE" },
          });
        }

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: `PAYJP_${type.toUpperCase().replace(".", "_")}`,
            entityType: "Tenant",
            entityId: tenant.id,
            afterJson: { plan: "ACTIVE", payjpEventType: type },
          },
        });
        break;
      }

      case "charge.failed":
      case "subscription.suspended": {
        const customerId = data.customer as string | undefined;
        if (!customerId) break;

        const tenant = await prisma.tenant.findUnique({
          where: { payjpCustomerId: customerId },
          select: { id: true, name: true, plan: true },
        });
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan: "SUSPENDED" },
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: `PAYJP_${type.toUpperCase().replace(".", "_")}`,
            entityType: "Tenant",
            entityId: tenant.id,
            beforeJson: { plan: tenant.plan },
            afterJson: { plan: "SUSPENDED", payjpEventType: type },
          },
        });
        break;
      }

      case "subscription.deleted": {
        const customerId = data.customer as string | undefined;
        if (!customerId) break;

        const tenant = await prisma.tenant.findUnique({
          where: { payjpCustomerId: customerId },
          select: { id: true, plan: true },
        });
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan: "SUSPENDED", payjpSubscriptionId: null },
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "PAYJP_SUBSCRIPTION_DELETED",
            entityType: "Tenant",
            entityId: tenant.id,
            beforeJson: { plan: tenant.plan },
            afterJson: { plan: "SUSPENDED", payjpEventType: type },
          },
        });
        break;
      }
    }
  } catch (err) {
    logger.error(`[payjp-webhook] error handling ${type}`, {}, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
