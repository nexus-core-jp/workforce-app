import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { alertPaymentFailed } from "@/lib/alerts";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error("[stripe-webhook] signature verification failed", {}, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check: skip already-processed events
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: { startsWith: "STRIPE_" },
      afterJson: { path: ["stripeEventId"], equals: event.id },
    },
  });
  if (existing) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) {
          logger.error("[stripe-webhook] missing tenantId in checkout metadata");
          break;
        }
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: "ACTIVE",
            paymentMethod: "STRIPE",
            stripeSubscriptionId: String(session.subscription ?? ""),
          },
        });
        await prisma.auditLog.create({
          data: {
            tenantId,
            action: "STRIPE_CHECKOUT_COMPLETED",
            entityType: "Tenant",
            entityId: tenantId,
            afterJson: {
              plan: "ACTIVE",
              subscriptionId: String(session.subscription ?? ""),
              amountTotal: session.amount_total,
              stripeEventId: event.id,
            },
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const tenant = await findTenantByCustomer(invoice.customer);
        if (tenant) {
          // Ensure ACTIVE plan on successful payment (recovers from past failures)
          if (tenant.plan !== "ACTIVE") {
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { plan: "ACTIVE" },
            });
          }
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              action: "STRIPE_PAYMENT_SUCCEEDED",
              entityType: "Tenant",
              entityId: tenant.id,
              beforeJson: { plan: tenant.plan },
              afterJson: {
                plan: "ACTIVE",
                invoiceId: invoice.id,
                amountPaid: invoice.amount_paid,
                currency: invoice.currency,
                periodStart: invoice.period_start,
                periodEnd: invoice.period_end,
                stripeEventId: event.id,
              },
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const tenant = await findTenantByCustomer(invoice.customer);
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
              afterJson: {
                plan: "SUSPENDED",
                invoiceId: invoice.id,
                attemptCount: invoice.attempt_count,
                stripeEventId: event.id,
              },
            },
          });
          alertPaymentFailed(tenant.name, tenant.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await findTenantByCustomer(subscription.customer);
        if (tenant) {
          // Update plan based on subscription status
          let newPlan: "ACTIVE" | "SUSPENDED" = "ACTIVE";
          if (subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "past_due") {
            newPlan = "SUSPENDED";
          }
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              plan: newPlan,
              stripeSubscriptionId: subscription.id,
            },
          });
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              action: "STRIPE_SUBSCRIPTION_UPDATED",
              entityType: "Tenant",
              entityId: tenant.id,
              beforeJson: { plan: tenant.plan },
              afterJson: {
                plan: newPlan,
                subscriptionId: subscription.id,
                status: subscription.status,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                stripeEventId: event.id,
              },
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await findTenantByCustomer(subscription.customer);
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
              afterJson: { plan: "SUSPENDED", stripeEventId: event.id },
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    logger.error(`[stripe-webhook] error handling ${event.type}`, {}, err);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  // Always return 200 for successfully verified events (even unhandled types)
  // to prevent Stripe from retrying indefinitely
  return NextResponse.json({ received: true });
}

async function findTenantByCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  const customerId =
    typeof customer === "string" ? customer : customer?.id ?? null;
  if (!customerId) return null;
  return prisma.tenant.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, name: true, plan: true, stripeSubscriptionId: true },
  });
}
