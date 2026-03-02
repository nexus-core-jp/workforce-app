import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ABORT: Cannot seed production database! This script is for development/staging only.",
    );
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  // --- Platform tenant + Super Admin ---
  const platform = await prisma.tenant.upsert({
    where: { slug: "__platform" },
    update: { name: "Platform" },
    create: { name: "Platform", slug: "__platform", plan: "ACTIVE" },
  });

  const superHash = await bcrypt.hash("superadmin123", 10);
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
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo", plan: "TRIAL", trialEndsAt },
    create: { name: "Demo", slug: "demo", plan: "TRIAL", trialEndsAt },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.local" } },
    update: { name: "Admin", role: UserRole.ADMIN, passwordHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.local",
      name: "Admin",
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "tanaka@demo.local" } },
    update: { name: "田中太郎", role: UserRole.EMPLOYEE, passwordHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "tanaka@demo.local",
      name: "田中太郎",
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "suzuki@demo.local" } },
    update: { name: "鈴木花子", role: UserRole.ADMIN, passwordHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "suzuki@demo.local",
      name: "鈴木花子",
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  console.log("Seeded successfully!");
  console.log("");
  console.log("=== スーパー管理者 ===");
  console.log("  会社ID: __platform");
  console.log("  メール: super@platform.local");
  console.log("  PW:     superadmin123");
  console.log("");
  console.log("=== Demo テナント ===");
  console.log("  管理者:  admin@demo.local   / password123");
  console.log("  従業員:  tanaka@demo.local  / password123");
  console.log("  承認者:  suzuki@demo.local  / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
