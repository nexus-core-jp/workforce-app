import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET: List all invoices (super admin only) */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  if (user.role !== "SUPER_ADMIN") return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as "PENDING" | "PAID" | "CANCELLED" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      confirmedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, invoices });
}
