import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { generateTotpSecret } from "@/lib/totp";

/**
 * POST /api/auth/totp/setup
 * Generates a new TOTP secret for the current user.
 * Returns the secret and otpauth URI for QR code display.
 * Does NOT enable TOTP yet — the user must verify a code first.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Only ADMIN and SUPER_ADMIN can set up 2FA
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, totpEnabled: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (dbUser.totpEnabled) {
    return NextResponse.json(
      { error: "2FAは既に有効です。無効化してから再設定してください。" },
      { status: 400 },
    );
  }

  const { secret, uri } = generateTotpSecret(dbUser.email);

  // Store the secret temporarily (not yet enabled)
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return NextResponse.json({ secret, uri });
}
