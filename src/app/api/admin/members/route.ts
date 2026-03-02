import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

const addSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: passwordSchema,
  role: z.enum(["EMPLOYEE", "APPROVER", "ADMIN"]),
  departmentId: z.string().nullable().optional(),
});

const patchSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["deactivate", "reactivate", "changeRole"]),
  role: z.enum(["EMPLOYEE", "APPROVER", "ADMIN"]).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suspended = await guardSuspended(user.tenantId);
  if (suspended) return suspended;

  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, email, password, role, departmentId } = parsed.data;

  // Check email uniqueness within tenant
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: user.tenantId, email } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "このメールアドレスは既に登録されています" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      tenantId: user.tenantId,
      email,
      name,
      role,
      passwordHash,
      departmentId: departmentId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "MEMBER_ADDED",
      entityType: "User",
      entityId: newUser.id,
      afterJson: { email, name, role, departmentId: departmentId ?? null },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = toSessionUser(session.user as Record<string, unknown>);
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suspended = await guardSuspended(actor.tenantId);
  if (suspended) return suspended;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { userId, action, role } = parsed.data;

  // Verify user belongs to same tenant
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== actor.tenantId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cannot modify yourself
  if (userId === actor.id) {
    return NextResponse.json(
      { error: "自分自身を変更することはできません" },
      { status: 400 },
    );
  }

  let auditAction: string;
  let beforeJson: object = {};
  let afterJson: object = {};

  switch (action) {
    case "deactivate":
      await prisma.user.update({ where: { id: userId }, data: { active: false } });
      auditAction = "MEMBER_DEACTIVATED";
      beforeJson = { active: true };
      afterJson = { active: false };
      break;
    case "reactivate":
      await prisma.user.update({ where: { id: userId }, data: { active: true } });
      auditAction = "MEMBER_REACTIVATED";
      beforeJson = { active: false };
      afterJson = { active: true };
      break;
    case "changeRole":
      if (!role) {
        return NextResponse.json({ error: "role is required" }, { status: 400 });
      }
      auditAction = "ROLE_CHANGED";
      beforeJson = { role: target.role };
      afterJson = { role };
      await prisma.user.update({ where: { id: userId }, data: { role } });
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      actorUserId: actor.id,
      action: auditAction,
      entityType: "User",
      entityId: userId,
      beforeJson,
      afterJson,
    },
  });

  return NextResponse.json({ ok: true });
}
