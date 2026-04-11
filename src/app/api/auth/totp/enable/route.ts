import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { generateRecoveryCodes, verifyTotp } from "@/lib/totp";

const schema = z.object({
  code: z.string().length(6),
});

/**
 * POST /api/auth/totp/enable
 * Verifies a TOTP code and enables 2FA for the current user.
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
    return NextResponse.json({ error: "6桁のコードを入力してください" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabled: true, tenantId: true },
  });

  if (!dbUser?.totpSecret) {
    return NextResponse.json(
      { error: "先にセットアップを実行してください" },
      { status: 400 },
    );
  }

  if (dbUser.totpEnabled) {
    return NextResponse.json({ error: "2FAは既に有効です" }, { status: 400 });
  }

  const valid = verifyTotp(dbUser.totpSecret, parsed.data.code);
  if (!valid) {
    return NextResponse.json({ error: "コードが正しくありません" }, { status: 400 });
  }

  // Generate recovery codes and store hashes. The plaintext is returned to
  // the caller exactly once — they are NOT persisted anywhere in plaintext.
  const { plaintext, hashes } = await generateRecoveryCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpRecoveryCodes: hashes,
      },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: dbUser.tenantId,
        actorUserId: user.id,
        action: "TOTP_ENABLED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, recoveryCodes: plaintext });
}
