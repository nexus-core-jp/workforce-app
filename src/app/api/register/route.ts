import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendRegistrationNotification, sendWelcomeEmail } from "@/lib/email";
import { extractClientIp } from "@/lib/ip";
import { passwordSchema } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  companyName: z.string().min(1, "会社名は必須です"),
  slug: z
    .string()
    .min(2, "会社IDは2文字以上必要です")
    .max(32)
    .regex(/^[a-z0-9_-]+$/, "会社IDは半角英数字・ハイフン・アンダースコアのみ使用できます"),
  adminName: z.string().min(1, "管理者名は必須です"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    // Rate limit: 3 registrations per IP per hour
    const ip = extractClientIp(request);
    const { limited } = await rateLimit(`register:${ip}`, 3, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: "登録試行の上限に達しました。しばらく待ってから再度お試しください。" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { companyName, slug, adminName, email, password } = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "この会社IDは既に使用されています" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          plan: "TRIAL",
          trialEndsAt,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name: adminName,
          role: "ADMIN",
          passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: adminUser.id,
          action: "TENANT_REGISTERED",
          entityType: "Tenant",
          entityId: tenant.id,
          afterJson: { companyName, slug, adminEmail: email },
        },
      });
    });

    // Fire-and-forget emails
    sendWelcomeEmail(email, adminName, companyName, slug, "password").catch((err) => {
      console.error("[register] welcome email failed:", err);
    });
    sendRegistrationNotification(companyName, slug, email).catch((err) => {
      console.error("[register] notification email failed:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register]", err);

    // Provide more specific error messages
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "この会社IDまたはメールアドレスは既に使用されています" },
        { status: 409 },
      );
    }
    if (message.includes("connect") || message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "サーバーの接続に問題が発生しています。しばらく待ってから再度お試しください。" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "登録に失敗しました。入力内容を確認して再度お試しください。" },
      { status: 500 },
    );
  }
}
