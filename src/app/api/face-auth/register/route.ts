import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  isValidDescriptor,
  MAX_DESCRIPTORS_PER_USER,
} from "@/lib/face-match";
import { rateLimit } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

const schema = z.object({
  descriptor: z.array(z.number()).length(128),
  label: z.string().max(50).optional(),
});

/** POST: Register a face descriptor for the current user */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  // Rate limit: 5 registrations per user per hour
  const { limited } = await rateLimit(`face-reg:${userId}`, 5, 60 * 60 * 1000);
  if (limited) return jsonError("登録試行の上限に達しました。しばらくお待ちください。", 429);

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  // Check face auth is enabled for this tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { faceAuthEnabled: true },
  });
  if (!tenant?.faceAuthEnabled) {
    return jsonError("Face authentication is not enabled for this tenant", 403);
  }

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  // Limit descriptors per user
  const count = await prisma.faceDescriptor.count({
    where: { tenantId, userId },
  });
  if (count >= MAX_DESCRIPTORS_PER_USER) {
    return jsonError(
      `Maximum ${MAX_DESCRIPTORS_PER_USER} face registrations allowed. Delete an existing one first.`,
      409,
    );
  }

  const fd = await prisma.faceDescriptor.create({
    data: {
      tenantId,
      userId,
      descriptor: JSON.stringify(input.data.descriptor),
      label: input.data.label ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: fd.id, count: count + 1 });
}

/** GET: List my face descriptors */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const descriptors = await prisma.faceDescriptor.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    select: { id: true, label: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, descriptors });
}

/** DELETE: Remove a face descriptor */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const raw = await req.json().catch(() => null);
  const id = raw?.id;
  if (typeof id !== "string") return jsonError("Missing descriptor id");

  // Ensure the descriptor belongs to this user (or caller is admin)
  const existing = await prisma.faceDescriptor.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) {
    return jsonError("Descriptor not found", 404);
  }
  if (existing.userId !== userId && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  await prisma.faceDescriptor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
