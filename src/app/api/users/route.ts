import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      hireDate: true,
      retiredAt: true,
      employmentType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, users });
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "OUTSOURCED"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id: actorId, tenantId, role } = session.user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const raw = await req.json().catch(() => null);
  const input = createSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: input.data.email } },
  });
  if (existing) return jsonError("Email already exists", 409);

  const passwordHash = await bcrypt.hash(input.data.password, 10);
  const hireDate = input.data.hireDate
    ? (() => {
        const [y, m, d] = input.data.hireDate.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000);
      })()
    : null;
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.data.email,
      name: input.data.name,
      role: input.data.role,
      passwordHash,
      hireDate,
      employmentType: input.data.employmentType ?? "FULL_TIME",
    },
  });

  await writeAuditLog({
    tenantId,
    actorUserId: actorId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, role: user.role },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active },
  });
}
