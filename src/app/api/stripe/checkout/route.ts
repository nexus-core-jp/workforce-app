import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  promoCode: z.string().max(100).optional(),
}).optional().default({});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  // Parse optional promo code from body
  const raw = await req.json().catch(() => ({}));
  const input = bodySchema.safeParse(raw);
  if (!input.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Create or reuse Stripe customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.AUTH_URL || "http://localhost:3002";

    // Resolve promo code to Stripe promotion code ID
    let discounts: Array<{ promotion_code: string }> = [];
    if (input.data.promoCode) {
      try {
        const promoCodes = await getStripe().promotionCodes.list({
          code: input.data.promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          discounts = [{ promotion_code: promoCodes.data[0].id }];
        } else {
          return NextResponse.json({ error: "無効なプロモーションコードです" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "プロモーションコードの検証に失敗しました" }, { status: 500 });
      }
    }

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenantId: tenant.id },
      ...(discounts.length > 0
        ? { discounts }
        : { allow_promotion_codes: true }),
      success_url: `${baseUrl}/admin/billing?success=1`,
      cancel_url: `${baseUrl}/admin/billing?canceled=1`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[stripe-checkout] error:", err);
    return NextResponse.json(
      { error: "決済の準備に失敗しました" },
      { status: 500 },
    );
  }
}
