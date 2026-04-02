import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  const errors: string[] = [];

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    errors.push("Database connection failed");
  }

  // 2. Tenant data exists (login is impossible without tenants)
  if (checks.database === "ok") {
    try {
      const count = await prisma.tenant.count();
      checks.tenants = count > 0 ? "ok" : "error";
      if (count === 0) errors.push("No tenants found — seed may not have been run");
    } catch {
      checks.tenants = "error";
      errors.push("Tenant table query failed");
    }
  }

  // 3. Auth configuration
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    checks.auth_secret = "ok";
  } else {
    checks.auth_secret = "error";
    errors.push("AUTH_SECRET is missing or too short");
  }

  const healthy = errors.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      ...(errors.length > 0 && { errors }),
    },
    { status: healthy ? 200 : 503 },
  );
}
