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

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) {
          console.error("[stripe-webhook] missing tenantId in checkout metadata");
          break;
        }
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: "ACTIVE",
            stripeSubscriptionId: String(session.subscription ?? ""),
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
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;
        if (!customerId) break;
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
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null;
        if (!customerId) break;
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
  } catch (err) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
