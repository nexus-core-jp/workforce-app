import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { limited } = await rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000); // 10 requests per 15 min
  if (limited) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてから再試行してください。" },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "無効なトークンです" }, { status: 400 });
  }

  if (resetToken.usedAt) {
    return NextResponse.json({ error: "このトークンは既に使用されています" }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "トークンの有効期限が切れています" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: resetToken.tenantId,
        actorUserId: resetToken.userId,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: resetToken.userId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
