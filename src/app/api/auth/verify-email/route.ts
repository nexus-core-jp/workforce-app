import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const verifySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "無効なリクエストです" }, { status: 400 });
    }

    const { token } = parsed.data;

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      return NextResponse.json(
        { error: "無効または期限切れのトークンです" },
        { status: 400 },
      );
    }

    // identifier stores the tenantId
    const tenantId = record.identifier;

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { emailVerified: true },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token: record.token } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "検証に失敗しました" },
      { status: 500 },
    );
  }
}
