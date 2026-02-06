import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo" },
    create: { name: "Demo", slug: "demo" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

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

  console.log("Seeded demo tenant + admin user: admin@demo.local / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
