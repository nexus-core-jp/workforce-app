import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    const today = startOfJstDay(now);

    // eCPM and CPC from env (defaults: ¥200 eCPM, ¥30 CPC)
    const eCPM = Number(process.env.AD_ECPM) || 200;
    const cpc = Number(process.env.AD_CPC) || 30;

    // Past 6 months of ad events
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [impressionLogs, clickLogs, freeTenants] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: "AD_IMPRESSION",
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true, entityId: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "AD_CLICK",
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true, entityId: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tenant.count({
        where: { slug: { not: "__platform" }, plan: "FREE" },
      }),
    ]);

    // Today's metrics
    const todayImpressions = impressionLogs.filter((l) => l.createdAt >= today).length;
    const todayClicks = clickLogs.filter((l) => l.createdAt >= today).length;
    const todayCtr = todayImpressions > 0
      ? Math.round((todayClicks / todayImpressions) * 10000) / 100
      : 0;

    // Monthly aggregation
    const monthlyMap = new Map<string, { impressions: number; clicks: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { impressions: 0, clicks: 0 });
    }

    for (const log of impressionLogs) {
      const key = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) entry.impressions++;
    }
    for (const log of clickLogs) {
      const key = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) entry.clicks++;
    }

    const monthly = [...monthlyMap.entries()].map(([month, data]) => {
      const ctr = data.impressions > 0
        ? Math.round((data.clicks / data.impressions) * 10000) / 100
        : 0;
      const estimatedRevenue = Math.round(
        (data.impressions / 1000) * eCPM + data.clicks * cpc,
      );
      return { month, ...data, ctr, estimatedRevenue };
    });

    // By slot aggregation
    const slotMap = new Map<string, { impressions: number; clicks: number }>();
    for (const log of impressionLogs) {
      if (!slotMap.has(log.entityId)) slotMap.set(log.entityId, { impressions: 0, clicks: 0 });
      slotMap.get(log.entityId)!.impressions++;
    }
    for (const log of clickLogs) {
      if (!slotMap.has(log.entityId)) slotMap.set(log.entityId, { impressions: 0, clicks: 0 });
      slotMap.get(log.entityId)!.clicks++;
    }

    const bySlot = [...slotMap.entries()].map(([slotId, data]) => ({
      slotId,
      ...data,
      ctr: data.impressions > 0
        ? Math.round((data.clicks / data.impressions) * 10000) / 100
        : 0,
    }));

    const totalImpressions = impressionLogs.length;
    const totalClicks = clickLogs.length;

    // Estimated monthly revenue based on current month's data
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = monthlyMap.get(currentMonthKey);
    const estimatedMonthlyRevenue = currentMonth
      ? Math.round((currentMonth.impressions / 1000) * eCPM + currentMonth.clicks * cpc)
      : 0;

    return NextResponse.json({
      ok: true,
      today: { impressions: todayImpressions, clicks: todayClicks, ctr: todayCtr },
      monthly,
      bySlot,
      freeTenants,
      totalImpressions,
      totalClicks,
      estimatedMonthlyRevenue,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch ad revenue data" },
      { status: 500 },
    );
  }
}
