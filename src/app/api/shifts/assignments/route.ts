import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId } = session.user;

  const assignments = await prisma.shiftAssignment.findMany({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      shiftPattern: { select: { name: true, plannedStart: true, plannedEnd: true } },
    },
  });

  return NextResponse.json({ ok: true, assignments });
}

function parseJstDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return startOfJstDay(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)));
}

const createSchema = z.object({
  userId: z.string().min(1),
  shiftPatternId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const assignment = await prisma.shiftAssignment.create({
    data: {
      tenantId,
      userId: input.data.userId,
      shiftPatternId: input.data.shiftPatternId,
      startDate: parseJstDate(input.data.startDate),
      endDate: parseJstDate(input.data.endDate),
    },
  });

  return NextResponse.json({ ok: true, assignment });
}
