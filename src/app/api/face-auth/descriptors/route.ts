import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isFaceAuthAvailable } from "@/lib/face-auth-config";

/**
 * GET: Fetch all face descriptors for a tenant (used by kiosk mode).
 * Requires ?tenantSlug=xxx query parameter.
 * No auth required (kiosk runs without login) — descriptors are float arrays, not secrets.
 */
export async function GET(req: Request) {
  if (!isFaceAuthAvailable()) return jsonError("Face auth is not available in this deployment", 403);

  const url = new URL(req.url);
  const slug = url.searchParams.get("tenantSlug");
  if (!slug) return jsonError("tenantSlug is required");

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, faceAuthEnabled: true },
  });
  if (!tenant) return jsonError("テナントが見つかりません", 404);
  if (!tenant.faceAuthEnabled) return jsonError("顔認証は無効です", 403);

  const descriptors = await prisma.faceDescriptor.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });

  // Only return active users
  const result = descriptors
    .filter((d) => d.user.active)
    .map((d) => ({
      userId: d.userId,
      userName: d.user.name ?? d.user.email,
      descriptor: JSON.parse(d.descriptor) as number[],
    }));

  return NextResponse.json({
    ok: true,
    tenantId: tenant.id,
    descriptors: result,
  });
}
