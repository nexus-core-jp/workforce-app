import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

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

  // Check face auth is enabled for this tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { faceAuthEnabled: true },
  });
  if (!tenant?.faceAuthEnabled) return jsonError("顔認証はこのテナントでは無効です", 403);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  // Limit descriptors per user to 5
  const count = await prisma.faceDescriptor.count({
    where: { tenantId: user.tenantId, userId: user.id },
  });
  if (count >= 5) return jsonError("顔データは最大5件まで登録できます。不要なものを削除してください。", 409);

  const fd = await prisma.faceDescriptor.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      descriptor: JSON.stringify(input.data.descriptor),
      label: input.data.label ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: fd.id });
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

  const raw = await req.json().catch(() => null);
  const id = raw?.id;
  if (typeof id !== "string") return jsonError("id is required");

  const fd = await prisma.faceDescriptor.findUnique({ where: { id } });
  if (!fd || fd.tenantId !== user.tenantId || fd.userId !== user.id) {
    return jsonError("見つかりません", 404);
  }

  await prisma.faceDescriptor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
