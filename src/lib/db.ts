import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma";

// Enable WebSocket connections for Neon serverless
neonConfig.useSecureWebSocket = true;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;

  // In production (Vercel serverless), use Neon's WebSocket adapter
  // In development, use standard TCP connection
  if (process.env.NODE_ENV === "production") {
    const pool = new Pool({ connectionString });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon(pool as any);
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
