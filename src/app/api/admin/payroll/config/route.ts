import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

const upsertSchema = z.object({
  userId: z.string().min(1),
  payType: z.enum(["MONTHLY", "HOURLY", "DAILY"]),
  baseSalary: z.number().int().min(0),
  hourlyRate: z.number().int().min(0),
  commuteAllowance: z.number().int().min(0).default(0),
  housingAllowance: z.number().int().min(0).default(0),
  familyAllowance: z.number().int().min(0).default(0),
  otherAllowance: z.number().int().min(0).default(0),
  otherAllowanceLabel: z.string().max(100).optional().nullable(),
  scheduledWorkDays: z.number().int().min(1).max(31).default(20),
  scheduledWorkMinutes: z.number().int().min(1).max(1440).default(480),
  overtimeRate: z.number().min(1.0).max(3.0).default(1.25),
  lateNightRate: z.number().min(1.0).max(3.0).default(1.5),
  holidayRate: z.number().min(1.0).max(3.0).default(1.35),
  bankName: z.string().max(100).optional().nullable(),
  bankCode: z.string().max(4).optional().nullable(),
  branchName: z.string().max(100).optional().nullable(),
  branchCode: z.string().max(3).optional().nullable(),
  accountType: z.string().max(10).optional().nullable(),
  accountNumber: z.string().max(7).optional().nullable(),
  accountHolder: z.string().max(100).optional().nullable(),
});

/** GET: List payroll configs for the tenant (or single user) */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = user;
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (userId) {
    const config = await prisma.payrollConfig.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ ok: true, config });
  }

  const configs = await prisma.payrollConfig.findMany({
    where: { tenantId },
    include: { user: { select: { name: true, email: true, active: true, role: true } } },
    orderBy: { user: { name: "asc" } },
  });

  // Also get users without configs for setup overview
  const allUsers = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const configuredUserIds = new Set(configs.map((c) => c.userId));
  const unconfiguredUsers = allUsers.filter((u) => !configuredUserIds.has(u.id));

  return NextResponse.json({ ok: true, configs, unconfiguredUsers });
}

/** POST: Create or update payroll config for a user */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const actor = toSessionUser(session.user as Record<string, unknown>);
  if (!actor || actor.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = actor;

  const raw = await req.json().catch(() => null);
  const input = upsertSchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  const { userId, ...data } = input.data;

  // Verify user belongs to same tenant
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser || targetUser.tenantId !== tenantId) {
    return jsonError("ユーザーが見つかりません", 404);
  }

  const config = await prisma.payrollConfig.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, ...data },
    update: data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.id,
      action: "PAYROLL_CONFIG_UPDATED",
      entityType: "PayrollConfig",
      entityId: config.id,
      afterJson: { userId, payType: data.payType, baseSalary: data.baseSalary },
    },
  });

  return NextResponse.json({ ok: true, config });
}
