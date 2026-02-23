import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const planSchema = z.object({
  plan: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const beforePlan = tenant.plan;

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: { plan: parsed.data.plan },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: id,
        actorUserId: user.id,
        action: "PLAN_CHANGED",
        entityType: "Tenant",
        entityId: id,
        beforeJson: { plan: beforePlan },
        afterJson: { plan: parsed.data.plan },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
