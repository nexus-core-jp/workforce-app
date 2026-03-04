import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const schema = z.object({
  password: z.string().min(1),
});

/**
 * POST /api/auth/totp/disable
 * Disables 2FA for the current user. Requires password confirmation.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, totpEnabled: true, tenantId: true },
  });

  if (!dbUser?.totpEnabled) {
    return NextResponse.json({ error: "2FAは無効です" }, { status: 400 });
  }

  if (!dbUser.passwordHash) {
    return NextResponse.json({ error: "パスワードが設定されていません" }, { status: 400 });
  }

  const ok = await bcrypt.compare(parsed.data.password, dbUser.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: dbUser.tenantId,
        actorUserId: user.id,
        action: "TOTP_DISABLED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
