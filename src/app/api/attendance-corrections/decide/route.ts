import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: approverUserId, tenantId, role } = session.user;

  if (!tenantId || !approverUserId) return jsonError("Invalid session", 401);
  if (role !== "ADMIN" && role !== "APPROVER") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const correction = await prisma.attendanceCorrection.findUnique({ where: { id: input.data.id } });
  if (!correction || correction.tenantId !== tenantId) return jsonError("Not found", 404);
  if (correction.status !== "PENDING") return jsonError("Already decided", 409);

  const updated = await prisma.attendanceCorrection.update({
    where: { id: correction.id },
    data: {
      status: input.data.decision,
      approverUserId,
      decidedAt: new Date(),
    },
  });

  // MVP: not applying changes to TimeEntry yet. We'll do that in next iteration.
  return NextResponse.json({ ok: true, correction: updated });
}
