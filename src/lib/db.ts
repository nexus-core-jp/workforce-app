import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;

  // In production (Vercel serverless), use Neon's WebSocket adapter
  // In development, use standard TCP connection
  if (process.env.NODE_ENV === "production") {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }

  return new PrismaClient({
    log: ["query", "error", "warn"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
