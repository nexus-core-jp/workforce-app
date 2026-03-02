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

  const departments = await prisma.department.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      approver: { select: { name: true, email: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ ok: true, departments });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  approverUserId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const existing = await prisma.department.findUnique({
    where: { tenantId_name: { tenantId, name: input.data.name } },
  });
  if (existing) return jsonError("Department name already exists", 409);

  const dept = await prisma.department.create({
    data: {
      tenantId,
      name: input.data.name,
      approverUserId: input.data.approverUserId ?? null,
    },
  });

  return NextResponse.json({ ok: true, department: dept });
}
