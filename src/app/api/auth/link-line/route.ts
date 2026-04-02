import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const linkSchema = z.object({
  providerAccountId: z.string().min(1),
  accessToken: z.string().optional(),
});

/**
 * POST: Link a LINE account to the current user.
 * Called after the admin initiates LINE account linking from settings.
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
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Check if already linked (either via Account or User.lineId)
  const [existingAccount, currentUser] = await Promise.all([
    prisma.account.findFirst({ where: { userId: user.id, provider: "line" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { lineId: true } }),
  ]);
  if (existingAccount || currentUser?.lineId) {
    return NextResponse.json({ error: "LINE アカウントは既に連携済みです" }, { status: 409 });
  }

  // Check if this LINE account is linked to another user (via Account or User.lineId)
  const [otherAccount, otherLineUser] = await Promise.all([
    prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "line",
          providerAccountId: parsed.data.providerAccountId,
        },
      },
    }),
    prisma.user.findFirst({
      where: { lineId: parsed.data.providerAccountId, NOT: { id: user.id } },
    }),
  ]);
  if (otherAccount || otherLineUser) {
    return NextResponse.json(
      { error: "この LINE アカウントは別のユーザーに連携されています" },
      { status: 409 },
    );
  }

  // Sync both Account record and User.lineId
  await prisma.$transaction([
    prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "line",
        providerAccountId: parsed.data.providerAccountId,
        access_token: parsed.data.accessToken,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lineId: parsed.data.providerAccountId },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "LINE_ACCOUNT_LINKED",
      entityType: "Account",
      entityId: user.id,
      afterJson: { provider: "line" },
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE: Unlink LINE account */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Sync both Account record and User.lineId
  const deleted = await prisma.account.deleteMany({
    where: { userId: user.id, provider: "line" },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "LINE 連携がありません" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lineId: null },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "LINE_ACCOUNT_UNLINKED",
      entityType: "Account",
      entityId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
