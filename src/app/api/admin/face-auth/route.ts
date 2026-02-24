import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const schema = z.object({
  enabled: z.boolean(),
});

/** PATCH: Toggle face auth for the tenant */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") return jsonError("Forbidden", 403);

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
      action: "FACE_AUTH_TOGGLED",
      entityType: "Tenant",
      entityId: user.tenantId,
      afterJson: { faceAuthEnabled: input.data.enabled },
    },
  });

  return NextResponse.json({ ok: true, faceAuthEnabled: input.data.enabled });
}
