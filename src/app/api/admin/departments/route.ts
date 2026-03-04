import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";

const createSchema = z.object({
  name: z.string().min(1, "部署名は必須です"),
  approverUserId: z.string().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["rename", "setApprover", "delete"]),
  name: z.string().min(1).optional(),
  approverUserId: z.string().nullable().optional(),
});

const assignSchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().nullable(),
});

/** GET — list all departments for this tenant */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const departments = await prisma.department.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      approver: { select: { id: true, name: true, email: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ departments });
}

/** POST — create a new department */
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, approverUserId } = parsed.data;

  const existing = await prisma.department.findUnique({
    where: { tenantId_name: { tenantId: user.tenantId, name } },
  });
  if (existing) {
    return NextResponse.json({ error: "この部署名は既に登録されています" }, { status: 409 });
  }

  const dept = await prisma.department.create({
    data: {
      tenantId: user.tenantId,
      name,
      approverUserId: approverUserId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "DEPARTMENT_CREATED",
      entityType: "Department",
      entityId: dept.id,
      afterJson: { name, approverUserId },
    },
  });

  return NextResponse.json({ ok: true, id: dept.id });
}

/** PATCH — rename, set approver, or delete a department */
export async function PATCH(request: Request) {
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

  // Handle member assignment
  if (body.userId !== undefined) {
    const assignParsed = assignSchema.safeParse(body);
    if (!assignParsed.success) {
      const msg = assignParsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { userId, departmentId } = assignParsed.data;

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { departmentId },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: "MEMBER_DEPARTMENT_CHANGED",
        entityType: "User",
        entityId: userId,
        beforeJson: { departmentId: target.departmentId },
        afterJson: { departmentId },
      },
    });

    return NextResponse.json({ ok: true });
  }

  // Handle department management
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id, action, name, approverUserId } = parsed.data;

  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept || dept.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "部署が見つかりません" }, { status: 404 });
  }

  switch (action) {
    case "rename": {
      if (!name) {
        return NextResponse.json({ error: "部署名は必須です" }, { status: 400 });
      }
      await prisma.department.update({ where: { id }, data: { name } });
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "DEPARTMENT_RENAMED",
          entityType: "Department",
          entityId: id,
          beforeJson: { name: dept.name },
          afterJson: { name },
        },
      });
      break;
    }
    case "setApprover": {
      await prisma.department.update({
        where: { id },
        data: { approverUserId: approverUserId ?? null },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "DEPARTMENT_APPROVER_CHANGED",
          entityType: "Department",
          entityId: id,
          beforeJson: { approverUserId: dept.approverUserId },
          afterJson: { approverUserId: approverUserId ?? null },
        },
      });
      break;
    }
    case "delete": {
      // Unlink users first (set departmentId to null)
      await prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      });
      await prisma.department.delete({ where: { id } });
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "DEPARTMENT_DELETED",
          entityType: "Department",
          entityId: id,
          beforeJson: { name: dept.name },
        },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
