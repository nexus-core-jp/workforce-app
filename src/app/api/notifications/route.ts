import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET: list my notifications */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const [latest, unreadCount] = await Promise.all([
    prisma.notification.findFirst({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
    prisma.notification.count({
      where: { tenantId, userId, read: false },
    }),
  ]);

  const etag = `"${latest?.id ?? "none"}:${latest?.createdAt?.getTime() ?? 0}:${unreadCount}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  const { searchParams } = new URL(req.url);
  const full = searchParams.get("full") === "1";
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  if (!full) {
    return NextResponse.json(
      { ok: true, unreadCount },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      },
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    { ok: true, notifications, unreadCount },
    {
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
}
