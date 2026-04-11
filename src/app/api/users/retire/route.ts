/**
 * POST /api/users/retire
 *   ユーザーを退職処理する: active=false + retiredAt=today
 *
 * POST /api/users/reinstate (同エンドポイントの action=reinstate)
 *   退職済みユーザーを復職させる。
 *
 * ADMIN only.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["retire", "reinstate"]),
  retiredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId, id: actorUserId } = session.user;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, tenantId },
    select: { id: true, active: true, retiredAt: true, email: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent retiring yourself or other admins (to avoid locking out the tenant)
  if (parsed.data.action === "retire" && target.id === actorUserId) {
    return NextResponse.json({ error: "自分自身は退職処理できません" }, { status: 400 });
  }

  if (parsed.data.action === "retire") {
    const retiredAt = parsed.data.retiredAt
      ? (() => {
          const [y, m, d] = parsed.data.retiredAt!.split("-").map(Number);
          return startOfJstDay(new Date(Date.UTC(y, m - 1, d)));
        })()
      : startOfJstDay(new Date());

    await prisma.user.update({
      where: { id: target.id },
      data: { active: false, retiredAt },
    });

    await writeAuditLog({
      tenantId,
      actorUserId,
      action: "USER_RETIRED",
      entityType: "User",
      entityId: target.id,
      before: { active: target.active, retiredAt: target.retiredAt },
      after: { active: false, retiredAt: retiredAt.toISOString() },
    });

    return NextResponse.json({ ok: true });
  }

  // reinstate
  await prisma.user.update({
    where: { id: target.id },
    data: { active: true, retiredAt: null },
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: "USER_REINSTATED",
    entityType: "User",
    entityId: target.id,
    before: { active: target.active, retiredAt: target.retiredAt },
    after: { active: true, retiredAt: null },
  });

  return NextResponse.json({ ok: true });
}
