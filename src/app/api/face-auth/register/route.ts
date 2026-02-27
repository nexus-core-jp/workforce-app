import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  isValidDescriptor,
  MAX_DESCRIPTORS_PER_USER,
} from "@/lib/face-match";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * POST /api/face-auth/register
 * Register a face descriptor for the authenticated user.
 * Body: { descriptor: number[] }   — 128-dimensional float array
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  // Ensure face auth is enabled for this tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { faceAuthEnabled: true },
  });
  if (!tenant?.faceAuthEnabled) {
    return jsonError("Face authentication is not enabled for this tenant", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  const descriptor = body?.descriptor;
  if (!isValidDescriptor(descriptor)) {
    return jsonError(
      "Invalid descriptor: expected a 128-element number array",
    );
  }

  // Check max descriptors per user
  const count = await prisma.faceDescriptor.count({
    where: { tenantId, userId },
  });
  if (count >= MAX_DESCRIPTORS_PER_USER) {
    return jsonError(
      `Maximum ${MAX_DESCRIPTORS_PER_USER} face registrations allowed. Delete an existing one first.`,
      409,
    );
  }

  const record = await prisma.faceDescriptor.create({
    data: { tenantId, userId, descriptor },
  });

  return NextResponse.json({
    ok: true,
    id: record.id,
    count: count + 1,
  });
}

/**
 * DELETE /api/face-auth/register
 * Delete a specific face descriptor.
 * Body: { id: string }
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  const descriptorId = body?.id;
  if (typeof descriptorId !== "string") {
    return jsonError("Missing descriptor id");
  }

  // Ensure the descriptor belongs to this user (or caller is admin)
  const existing = await prisma.faceDescriptor.findUnique({
    where: { id: descriptorId },
  });
  if (!existing || existing.tenantId !== tenantId) {
    return jsonError("Descriptor not found", 404);
  }
  if (existing.userId !== userId && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  await prisma.faceDescriptor.delete({ where: { id: descriptorId } });

  return NextResponse.json({ ok: true });
}
