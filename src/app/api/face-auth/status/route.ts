import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * GET /api/face-auth/status
 * Returns the face-auth status for the current user:
 * - faceAuthEnabled: whether the tenant requires face auth
 * - registered: whether the user has at least one descriptor
 * - count: how many descriptors are registered
 * - descriptors: list of { id, createdAt } for management
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const [tenant, descriptors] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { faceAuthEnabled: true },
    }),
    prisma.faceDescriptor.findMany({
      where: { tenantId, userId },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    faceAuthEnabled: tenant?.faceAuthEnabled ?? false,
    registered: descriptors.length > 0,
    count: descriptors.length,
    descriptors: descriptors.map((d) => ({
      id: d.id,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
