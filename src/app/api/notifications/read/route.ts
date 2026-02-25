import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

/** POST: mark notification(s) as read */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  if (input.data.all) {
    await prisma.notification.updateMany({
      where: { tenantId, userId, read: false },
      data: { read: true },
    });
  } else if (input.data.id) {
    await prisma.notification.updateMany({
      where: { id: input.data.id, tenantId, userId },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
