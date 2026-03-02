import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  tenant: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  // Rate limit: 5 requests per 15 minutes per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`forgot-pw:${ip}`, { max: 5, windowSec: 900 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってから再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { tenant: slug, email } = parsed.data;

  // Always return 200 to prevent email enumeration
  const ok = NextResponse.json({ ok: true });

  const dbTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!dbTenant) return ok;

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: dbTenant.id, email } },
  });
  if (!user || !user.active) return ok;

  // Limit unused tokens to 3 per user — delete oldest if exceeded
  const existingTokens = await prisma.passwordResetToken.findMany({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existingTokens.length >= 3) {
    const toDelete = existingTokens.slice(0, existingTokens.length - 2);
    await prisma.passwordResetToken.deleteMany({
      where: { id: { in: toDelete.map((t) => t.id) } },
    });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      tenantId: dbTenant.id,
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const baseUrl = process.env.AUTH_URL || "http://localhost:3002";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // Fire-and-forget
  sendPasswordResetEmail(email, resetUrl, user.name ?? email).catch((err) => {
    console.error("[forgot-password] email failed:", err);
  });

  return ok;
}
