import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isMonthClosed } from "@/lib/close";
import { diffMinutes, startOfJstDay } from "@/lib/time";

const schema = z.object({
  tenantSlug: z.string().min(1),
  userId: z.string().min(1),
  action: z.enum(["CLOCK_IN", "CLOCK_OUT"]),
});

function computeWorkMinutes(entry: {
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}): number {
  if (!entry.clockInAt || !entry.clockOutAt) return 0;
  const total = diffMinutes(entry.clockInAt, entry.clockOutAt);
  let breakMin = 0;
  if (entry.breakStartAt && entry.breakEndAt) {
    breakMin = Math.max(0, diffMinutes(entry.breakStartAt, entry.breakEndAt));
  }
  return Math.max(0, total - breakMin);
}

/**
 * POST: Kiosk face-auth punch.
 * No session auth — identity is verified via face recognition on client.
 * Rate-limited by IP in production.
 */
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  const { tenantSlug, userId, action } = input.data;

  // Verify tenant + face auth enabled
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, faceAuthEnabled: true, plan: true },
  });
  if (!tenant) return jsonError("テナントが見つかりません", 404);
  if (!tenant.faceAuthEnabled) return jsonError("顔認証は無効です", 403);
  if (tenant.plan === "SUSPENDED") return jsonError("アカウントが停止中です", 403);

  // Verify user belongs to this tenant and has face descriptors
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tenantId !== tenant.id || !user.active) {
    return jsonError("ユーザーが見つかりません", 404);
  }

  const fdCount = await prisma.faceDescriptor.count({
    where: { tenantId: tenant.id, userId },
  });
  if (fdCount === 0) return jsonError("顔データが未登録です", 403);

  const tenantId = tenant.id;
  const today = startOfJstDay(new Date());
  const now = new Date();

  if (await isMonthClosed(tenantId, today)) {
    return jsonError("今月は締め処理済みです", 409);
  }

  // Upsert today's entry
  const entry = await prisma.timeEntry.upsert({
    where: { tenantId_userId_date: { tenantId, userId, date: today } },
    create: { tenantId, userId, date: today },
    update: {},
  });

  if (action === "CLOCK_IN") {
    if (entry.clockInAt) return jsonError("既に出勤済みです", 409);
    try {
      const updated = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: { clockInAt: now },
      });
      return NextResponse.json({
        ok: true,
        action: "CLOCK_IN",
        userName: user.name ?? user.email,
        time: now.toISOString(),
        entry: updated,
      });
    } catch (err) {
      console.error("[kiosk-punch] DB error:", err);
      return jsonError("打刻の保存に失敗しました", 500);
    }
  }

  if (action === "CLOCK_OUT") {
    if (!entry.clockInAt) return jsonError("出勤していません", 409);
    if (entry.clockOutAt) return jsonError("既に退勤済みです", 409);
    try {
      const updated = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          clockOutAt: now,
          workMinutes: computeWorkMinutes({
            clockInAt: entry.clockInAt,
            clockOutAt: now,
            breakStartAt: entry.breakStartAt,
            breakEndAt: entry.breakEndAt,
          }),
        },
      });
      return NextResponse.json({
        ok: true,
        action: "CLOCK_OUT",
        userName: user.name ?? user.email,
        time: now.toISOString(),
        entry: updated,
      });
    } catch (err) {
      console.error("[kiosk-punch] DB error:", err);
      return jsonError("打刻の保存に失敗しました", 500);
    }
  }

  return jsonError("Invalid action");
}
