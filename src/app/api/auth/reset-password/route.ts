import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "パスワードは8文字以上必要です"),
});

export async function POST(request: Request) {
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
