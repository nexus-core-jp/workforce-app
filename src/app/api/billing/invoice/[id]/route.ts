import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET: Retrieve invoice details as JSON (for tenant admin or super admin) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });

  if (!invoice) return jsonError("Invoice not found", 404);

  // Only tenant ADMIN or SUPER_ADMIN can view
  if (user.role === "SUPER_ADMIN" || (user.role === "ADMIN" && user.tenantId === invoice.tenantId)) {
    return NextResponse.json({ ok: true, invoice });
  }

  return jsonError("Forbidden", 403);
}
