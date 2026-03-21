import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const impressionSchema = z.object({
  slotId: z.string().min(1),
});

/**
 * POST /api/ad-impression
 *
 * Records an ad impression event for analytics.
 * Used by AdSlot components to track which ad slots are being viewed.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = impressionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "AD_IMPRESSION",
      entityType: "AdSlot",
      entityId: parsed.data.slotId,
      afterJson: {
        slotId: parsed.data.slotId,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ ok: true });
}
