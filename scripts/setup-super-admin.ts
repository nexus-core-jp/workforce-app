/**
 * Production-safe Super Admin bootstrap script.
 *
 * Creates the __platform tenant and a SUPER_ADMIN user.
 * Safe to run multiple times (idempotent via upsert).
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=YourStr0ng! npx tsx scripts/setup-super-admin.ts
 *
 * Or set the env vars in .env and run:
 *   npx tsx scripts/setup-super-admin.ts
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ERROR: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
    console.error("");
    console.error("Usage:");
    console.error("  SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=YourStr0ng! npx tsx scripts/setup-super-admin.ts");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }

  // 1. Create or update the __platform tenant
  const platform = await prisma.tenant.upsert({
    where: { slug: "__platform" },
    update: { name: "Platform" },
    create: { name: "Platform", slug: "__platform", plan: "ACTIVE" },
  });

  // 2. Create or update the super admin user
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platform.id, email } },
    update: {
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      passwordHash,
      active: true,
    },
    create: {
      tenantId: platform.id,
      email,
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      passwordHash,
    },
  });

  console.log("");
  console.log("=== Super Admin setup complete ===");
  console.log(`  Email:    ${email}`);
  console.log(`  Login:    /super-admin/login`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
