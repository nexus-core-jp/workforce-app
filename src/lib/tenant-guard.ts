import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Check if the tenant's plan is SUSPENDED and return a 403 response if so.
 * Call this at the top of every data-mutating API route.
 * Returns null if the tenant is active (OK to proceed).
 */
export async function guardSuspended(tenantId: string): Promise<NextResponse | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "Tenant not found" },
      { status: 404 },
    );
  }

  if (tenant.plan === "SUSPENDED") {
    return NextResponse.json(
      { ok: false, error: "アカウントが停止されています" },
      { status: 403 },
    );
  }

  return null;
}
