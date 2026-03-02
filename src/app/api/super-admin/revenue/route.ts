import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch active subscriptions from Stripe for MRR calculation
    const subscriptions = await getStripe().subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    });

    // MRR: sum of monthly recurring amounts
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        let monthly = 0;
        if (price.recurring?.interval === "month") {
          monthly = (price.unit_amount ?? 0) * (item.quantity ?? 1);
        } else if (price.recurring?.interval === "year") {
          monthly = Math.round(((price.unit_amount ?? 0) * (item.quantity ?? 1)) / 12);
        }
        // Apply first discount if present
        const firstDiscount = sub.discounts?.[0];
        const discountObj = firstDiscount && typeof firstDiscount !== "string" ? firstDiscount : null;
        const coupon = discountObj?.source?.coupon;
        const couponObj = coupon && typeof coupon !== "string" ? coupon : null;
        if (couponObj?.percent_off) {
          monthly = Math.round(monthly * (1 - couponObj.percent_off / 100));
        } else if (couponObj?.amount_off) {
          monthly = Math.max(0, monthly - couponObj.amount_off);
        }
        mrr += monthly;
      }
    }

    // Trial-to-paid conversion rate
    const [totalTenants, activeTenants, trialTenants, suspendedTenants] = await Promise.all([
      prisma.tenant.count({ where: { slug: { not: "__platform" } } }),
      prisma.tenant.count({ where: { slug: { not: "__platform" }, plan: "ACTIVE" } }),
      prisma.tenant.count({ where: { slug: { not: "__platform" }, plan: "TRIAL" } }),
      prisma.tenant.count({ where: { slug: { not: "__platform" }, plan: "SUSPENDED" } }),
    ]);

    // Conversion rate = active / (active + suspended) — those who reached decision point
    const decidedTenants = activeTenants + suspendedTenants;
    const conversionRate = decidedTenants > 0
      ? Math.round((activeTenants / decidedTenants) * 1000) / 10
      : 0;

    // Churn: suspended with a previous subscription / all who ever had subscription
    const everSubscribed = activeTenants + suspendedTenants;
    const churnRate = everSubscribed > 0
      ? Math.round((suspendedTenants / everSubscribed) * 1000) / 10
      : 0;

    // Recent invoices (last 20) for payment history
    const recentInvoices = await getStripe().invoices.list({
      limit: 20,
      status: "paid",
    });

    const invoiceHistory = recentInvoices.data.map((inv) => ({
      id: inv.id,
      customerName: inv.customer_name ?? inv.customer_email ?? String(inv.customer),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
        : null,
    }));

    // Monthly revenue trend (from audit logs of successful payments)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const paymentLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["STRIPE_PAYMENT_SUCCEEDED", "STRIPE_CHECKOUT_COMPLETED"] },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true, afterJson: true },
      orderBy: { createdAt: "asc" },
    });

    const monthlyRevenue = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue.set(key, 0);
    }
    for (const log of paymentLogs) {
      const key = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenue.has(key)) {
        const amount = (log.afterJson as Record<string, unknown>)?.amountPaid ?? 0;
        monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + Number(amount));
      }
    }

    return NextResponse.json({
      ok: true,
      mrr,
      arr: mrr * 12,
      activeSubscriptions: subscriptions.data.length,
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      conversionRate,
      churnRate,
      invoiceHistory,
      monthlyRevenue: [...monthlyRevenue.entries()].map(([month, amount]) => ({ month, amount })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch revenue data" },
      { status: 500 },
    );
  }
}
