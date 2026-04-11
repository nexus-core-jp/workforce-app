import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

/**
 * POST /api/onboarding/complete
 * Marks the current tenant's onboarding as complete. ADMIN only.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId, id: actorUserId } = session.user;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { onboardingCompleted: true },
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: "ONBOARDING_COMPLETED",
    entityType: "Tenant",
    entityId: tenantId,
  });

  return NextResponse.json({ ok: true });
}
