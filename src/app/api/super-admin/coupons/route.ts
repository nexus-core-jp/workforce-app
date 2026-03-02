import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { toSessionUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, "英数字・ハイフン・アンダースコアのみ"),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOff: z.number().int().min(1).optional(),
  currency: z.string().default("jpy"),
  duration: z.enum(["once", "repeating", "forever"]).default("once"),
  durationInMonths: z.number().int().min(1).max(36).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  expiresAt: z.string().optional(), // ISO date
});

function requireSuperAdmin() {
  return auth().then((session) => {
    if (!session?.user) return null;
    const u = toSessionUser(session.user as Record<string, unknown>);
    return u?.role === "SUPER_ADMIN" ? u : null;
  });
}

/** GET: List active coupons with their promotion codes */
export async function GET() {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [coupons, promoCodes] = await Promise.all([
      getStripe().coupons.list({ limit: 50 }),
      getStripe().promotionCodes.list({ limit: 100 }),
    ]);

    const items = coupons.data.map((c) => {
      const codes = promoCodes.data.filter((p) => {
        const coupon = p.promotion?.coupon;
        const couponId = typeof coupon === "string" ? coupon : coupon?.id;
        return couponId === c.id;
      });
      return {
        id: c.id,
        name: c.name,
        percentOff: c.percent_off,
        amountOff: c.amount_off,
        currency: c.currency,
        duration: c.duration,
        durationInMonths: c.duration_in_months,
        timesRedeemed: c.times_redeemed,
        maxRedemptions: c.max_redemptions,
        valid: c.valid,
        createdAt: new Date(c.created * 1000).toISOString(),
        promoCodes: codes.map((p) => ({
          id: p.id,
          code: p.code,
          active: p.active,
          timesRedeemed: p.times_redeemed,
          maxRedemptions: p.max_redemptions,
          expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null,
        })),
      };
    });

    return NextResponse.json({ ok: true, coupons: items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe API error" },
      { status: 500 },
    );
  }
}

/** POST: Create a coupon + promotion code */
export async function POST(req: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) {
    return NextResponse.json(
      { error: input.error.issues.map((e) => e.message).join(", ") },
      { status: 400 },
    );
  }

  const { name, code, percentOff, amountOff, currency, duration, durationInMonths, maxRedemptions, expiresAt } = input.data;

  if (!percentOff && !amountOff) {
    return NextResponse.json({ error: "percentOff または amountOff のいずれかが必須です" }, { status: 400 });
  }

  try {
    // Create Stripe coupon
    const coupon = await getStripe().coupons.create({
      name,
      ...(percentOff ? { percent_off: percentOff } : { amount_off: amountOff, currency }),
      duration,
      ...(duration === "repeating" && durationInMonths ? { duration_in_months: durationInMonths } : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
    });

    // Create promotion code for the coupon
    const promoCode = await getStripe().promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: code.toUpperCase(),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      ...(expiresAt ? { expires_at: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
    });

    return NextResponse.json({
      ok: true,
      coupon: { id: coupon.id, name: coupon.name },
      promoCode: { id: promoCode.id, code: promoCode.code },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe API error" },
      { status: 500 },
    );
  }
}

/** DELETE: Deactivate a coupon */
export async function DELETE(req: Request) {
  const actor = await requireSuperAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const id = raw?.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await getStripe().coupons.del(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe API error" },
      { status: 500 },
    );
  }
}
