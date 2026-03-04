import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId } = session.user;

  const patterns = await prisma.shiftPattern.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, patterns });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  plannedStart: z.string().regex(/^\d{2}:\d{2}$/),
  plannedEnd: z.string().regex(/^\d{2}:\d{2}$/),
  defaultBreakMinutes: z.number().int().min(0).default(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const existing = await prisma.shiftPattern.findUnique({
    where: { tenantId_name: { tenantId, name: input.data.name } },
  });
  if (existing) return jsonError("Shift pattern name already exists", 409);

  const pattern = await prisma.shiftPattern.create({
    data: {
      tenantId,
      name: input.data.name,
      plannedStart: input.data.plannedStart,
      plannedEnd: input.data.plannedEnd,
      defaultBreakMinutes: input.data.defaultBreakMinutes,
    },
  });

  return NextResponse.json({ ok: true, pattern });
}
