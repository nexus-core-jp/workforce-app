import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * GET /api/admin/face-auth
 * Returns the current face-auth setting for the tenant.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { faceAuthEnabled: true },
  });

  // Count of users who have registered faces
  const registeredUserCount = await prisma.faceDescriptor.groupBy({
    by: ["userId"],
    where: { tenantId: user.tenantId },
  });

  const totalUsers = await prisma.user.count({
    where: { tenantId: user.tenantId, active: true, role: { not: "SUPER_ADMIN" } },
  });

  return NextResponse.json({
    ok: true,
    faceAuthEnabled: tenant?.faceAuthEnabled ?? false,
    registeredUsers: registeredUserCount.length,
    totalUsers,
  });
}

/**
 * PATCH /api/admin/face-auth
 * Toggle face authentication on/off for the tenant.
 * Body: { enabled: boolean }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const suspended = await guardSuspended(user.tenantId);
  if (suspended) return suspended;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") {
    return jsonError("Missing or invalid 'enabled' field (boolean required)");
  }

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { faceAuthEnabled: enabled },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: enabled ? "FACE_AUTH_ENABLED" : "FACE_AUTH_DISABLED",
      entityType: "Tenant",
      entityId: user.tenantId,
      afterJson: { faceAuthEnabled: enabled },
    },
  });

  return NextResponse.json({ ok: true, faceAuthEnabled: enabled });
}
