import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

const schema = z.object({
  enabled: z.boolean(),
});

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

/** PATCH: Toggle face auth for the tenant */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const suspended = await guardSuspended(user.tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError("Invalid input");

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { faceAuthEnabled: input.data.enabled },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: input.data.enabled ? "FACE_AUTH_ENABLED" : "FACE_AUTH_DISABLED",
      entityType: "Tenant",
      entityId: user.tenantId,
      afterJson: { faceAuthEnabled: input.data.enabled },
    },
  });

  return NextResponse.json({ ok: true, faceAuthEnabled: input.data.enabled });
}
