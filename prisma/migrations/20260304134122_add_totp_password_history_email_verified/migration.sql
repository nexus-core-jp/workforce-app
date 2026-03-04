-- AlterTable: Add TOTP fields to User
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add emailVerified to Tenant
ALTER TABLE "Tenant" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: PasswordHistory
CREATE TABLE "PasswordHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordHistory_userId_createdAt_idx" ON "PasswordHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Additional indexes on AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_entityType_idx" ON "AuditLog"("tenantId", "entityType");

-- CreateIndex: Additional index on LeaveRequest
CREATE INDEX IF NOT EXISTS "LeaveRequest_tenantId_userId_status_idx" ON "LeaveRequest"("tenantId", "userId", "status");
