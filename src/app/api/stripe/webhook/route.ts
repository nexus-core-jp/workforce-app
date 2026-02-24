import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId;
      if (tenantId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: "ACTIVE",
            stripeSubscriptionId: session.subscription as string,
          },
        });
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: "STRIPE_CHECKOUT_COMPLETED",
            entityType: "Tenant",
            entityId: tenantId,
            afterJson: { plan: "ACTIVE", subscriptionId: String(session.subscription ?? "") },
          },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const tenant = await prisma.tenant.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan: "SUSPENDED" },
        });
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "STRIPE_PAYMENT_FAILED",
            entityType: "Tenant",
            entityId: tenant.id,
            beforeJson: { plan: tenant.plan },
            afterJson: { plan: "SUSPENDED" },
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const tenant = await prisma.tenant.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan: "SUSPENDED", stripeSubscriptionId: null },
        });
        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "STRIPE_SUBSCRIPTION_DELETED",
            entityType: "Tenant",
            entityId: tenant.id,
            beforeJson: { plan: tenant.plan },
            afterJson: { plan: "SUSPENDED" },
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
