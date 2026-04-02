import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron job — runs every 10 minutes to verify the system is healthy.
 * If database is unreachable or critical config is missing, logs an error
 * and optionally sends a Slack alert.
 */
export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  // 1. Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tenantCount = await prisma.tenant.count();
    if (tenantCount === 0) errors.push("No tenants in database");

    // Warn about trial tenants expiring within 7 days
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const expiring = await prisma.tenant.findMany({
      where: { plan: "TRIAL", trialEndsAt: { lte: soon } },
      select: { slug: true, trialEndsAt: true },
    });
    for (const t of expiring) {
      const expired = t.trialEndsAt && t.trialEndsAt.getTime() < Date.now();
      errors.push(
        expired
          ? `Tenant "${t.slug}" trial has EXPIRED (${t.trialEndsAt?.toISOString()})`
          : `Tenant "${t.slug}" trial expires soon (${t.trialEndsAt?.toISOString()})`,
      );
    }
  } catch (err) {
    errors.push(`Database unreachable: ${(err as Error).message}`);
  }

  // 2. Auth
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    errors.push("AUTH_SECRET is missing or too short");
  }

  // 3. Report
  if (errors.length > 0) {
    logger.error("cron.health_check_failed", { errors });

    // Send Slack alert if webhook is configured
    const slackUrl = process.env.SLACK_ALERT_WEBHOOK_URL;
    if (slackUrl) {
      try {
        await fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 Workforce Nexus ヘルスチェック失敗\n${errors.map((e) => `• ${e}`).join("\n")}`,
          }),
        });
      } catch (err) {
        logger.error("cron.slack_alert_failed", {}, err as Error);
      }
    }

    return NextResponse.json({ status: "error", errors }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
