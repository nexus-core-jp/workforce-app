import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma";

const prisma = new PrismaClient();

function generatePassword(): string {
  // 16-char random password: base64 ensures uppercase, lowercase, digits
  return crypto.randomBytes(12).toString("base64url");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ABORT: Cannot seed production database! This script is for development/staging only.",
    );
  }

  const superPassword = process.env.SEED_SUPER_PASSWORD || "superadmin123";
  const demoPassword = process.env.SEED_DEMO_PASSWORD || "password123";

  const superHash = await bcrypt.hash(superPassword, 10);
  const demoHash = await bcrypt.hash(demoPassword, 10);

  // --- Platform tenant + Super Admin ---
  const platform = await prisma.tenant.upsert({
    where: { slug: "__platform" },
    update: { name: "Platform" },
    create: { name: "Platform", slug: "__platform", plan: "ACTIVE" },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platform.id, email: "super@platform.local" } },
    update: { name: "Super Admin", role: UserRole.SUPER_ADMIN, passwordHash: superHash, active: true },
    create: {
      tenantId: platform.id,
      email: "super@platform.local",
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      passwordHash: superHash,
    },
  });

  // --- Demo tenant ---
  // Use ACTIVE plan so the demo tenant never expires and locks users out.
  // Real tenants start as TRIAL via the registration flow.
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo", plan: "ACTIVE", trialEndsAt: null },
    create: { name: "Demo", slug: "demo", plan: "ACTIVE" },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.local" } },
    update: { name: "Admin", role: UserRole.ADMIN, passwordHash: demoHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.local",
      name: "Admin",
      role: UserRole.ADMIN,
      passwordHash: demoHash,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "tanaka@demo.local" } },
    update: { name: "田中太郎", role: UserRole.EMPLOYEE, passwordHash: demoHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "tanaka@demo.local",
      name: "田中太郎",
      role: UserRole.EMPLOYEE,
      passwordHash: demoHash,
    },
  });

  console.log("Seeded successfully!");
  console.log("");
  console.log("=== スーパー管理者 ===");
  console.log("  会社ID: __platform");
  console.log("  メール: super@platform.local");
  console.log(`  PW:     ${superPassword}`);
  console.log("");
  console.log("=== Demo テナント (共通パスワード) ===");
  console.log("  管理者: admin@demo.local");
  console.log("  従業員: tanaka@demo.local");
  console.log(`  PW:     ${demoPassword}`);
  console.log("");
  console.log("💡 パスワードを変更するには SEED_SUPER_PASSWORD / SEED_DEMO_PASSWORD 環境変数を設定して再実行してください。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
