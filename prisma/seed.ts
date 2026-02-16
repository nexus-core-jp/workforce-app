import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.warn("WARNING: Running seed in production. Demo credentials will be created.");
    console.warn("Change the admin password immediately after seeding.");
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo" },
    create: { name: "Demo", slug: "demo" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
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

  // Create a regular employee for testing
  const empHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "employee@demo.local" } },
    update: { name: "Employee", role: UserRole.EMPLOYEE, passwordHash: empHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "employee@demo.local",
      name: "Employee Taro",
      role: UserRole.EMPLOYEE,
      passwordHash: empHash,
    },
  });

  // Create an approver for testing
  const apHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "approver@demo.local" } },
    update: { name: "Approver", role: UserRole.APPROVER, passwordHash: apHash, active: true },
    create: {
      tenantId: tenant.id,
      email: "approver@demo.local",
      name: "Approver Hanako",
      role: UserRole.APPROVER,
      passwordHash: apHash,
    },
  });

  console.log("Seeded demo tenant + users:");
  console.log("  admin:    admin@demo.local / password123");
  console.log("  employee: employee@demo.local / password123");
  console.log("  approver: approver@demo.local / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
