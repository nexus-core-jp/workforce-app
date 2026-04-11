/**
 * POST /api/auth/totp/recovery-codes
 *   Regenerate recovery codes. Returns the new plaintext codes once.
 *   Invalidates any existing unused codes.
 *
 * GET — returns only the remaining count (never plaintext).
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { generateRecoveryCodes } from "@/lib/totp";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpRecoveryCodes: true, totpEnabled: true },
  });
  if (!dbUser?.totpEnabled) {
    return NextResponse.json({ error: "2FAが有効ではありません" }, { status: 400 });
  }

  const codes = Array.isArray(dbUser.totpRecoveryCodes) ? dbUser.totpRecoveryCodes : [];
  return NextResponse.json({ remaining: codes.length });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true, tenantId: true },
  });
  if (!dbUser?.totpEnabled) {
    return NextResponse.json({ error: "2FAを先に有効化してください" }, { status: 400 });
  }

  const { plaintext, hashes } = await generateRecoveryCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { totpRecoveryCodes: hashes },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: dbUser.tenantId,
        actorUserId: user.id,
        action: "TOTP_RECOVERY_REGENERATED",
        entityType: "User",
        entityId: user.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, recoveryCodes: plaintext });
}
