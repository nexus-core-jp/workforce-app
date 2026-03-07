-- Step 1: Migrate existing APPROVER users to ADMIN
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'APPROVER';

-- Step 2: Recreate UserRole enum without APPROVER
-- PostgreSQL doesn't support removing values from enums directly
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
DROP TYPE "UserRole_old";

-- Step 3: Create PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYJP', 'BANK_TRANSFER', 'NONE');

-- Step 4: Create InvoiceStatus enum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- Step 5: Add payment columns to Tenant
ALTER TABLE "Tenant" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Tenant" ADD COLUMN "payjpCustomerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "payjpSubscriptionId" TEXT;

-- Step 6: Set paymentMethod to STRIPE for tenants that already have stripeCustomerId
UPDATE "Tenant" SET "paymentMethod" = 'STRIPE' WHERE "stripeCustomerId" IS NOT NULL;

-- Step 7: Create unique index on payjpCustomerId
CREATE UNIQUE INDEX "Tenant_payjpCustomerId_key" ON "Tenant"("payjpCustomerId");

-- Step 8: Create Invoice table
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'jpy',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- Step 9: Create indexes for Invoice
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");

-- Step 10: Add foreign keys for Invoice
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
