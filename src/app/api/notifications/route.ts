import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET: list my notifications */
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { tenantId, userId, read: false },
    }),
  ]);

  return NextResponse.json({ ok: true, notifications, unreadCount });
}
