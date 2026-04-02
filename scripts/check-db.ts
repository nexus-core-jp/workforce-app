/**
 * Pre-deployment database connectivity check.
 * Run during Vercel build to catch misconfigured DATABASE_URL before going live.
 *
 * Usage: tsx scripts/check-db.ts
 */
import { PrismaClient } from "../src/generated/prisma";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }
  if (url.includes("USER:PASSWORD") || url.includes("ep-xxx")) {
    console.error("❌ DATABASE_URL is still a template placeholder");
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection OK");

    // Verify essential tables exist
    const tenantCount = await prisma.tenant.count();
    if (tenantCount === 0) {
      console.warn("⚠️  Warning: No tenants found — run 'npm run db:seed' if this is a fresh deployment");
    }
  } catch (err) {
    console.error("❌ Database connection failed:", (err as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
