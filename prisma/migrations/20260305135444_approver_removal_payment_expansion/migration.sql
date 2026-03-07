-- CreateEnum
CREATE TYPE "HalfDayType" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('MONTHLY', 'HOURLY', 'DAILY');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- AlterTable
ALTER TABLE "FaceDescriptor" ADD COLUMN     "label" TEXT,
ALTER COLUMN "descriptor" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "halfType" "HalfDayType",
ADD COLUMN     "hours" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payType" "PayType" NOT NULL DEFAULT 'MONTHLY',
    "baseSalary" INTEGER NOT NULL DEFAULT 0,
    "hourlyRate" INTEGER NOT NULL DEFAULT 0,
    "commuteAllowance" INTEGER NOT NULL DEFAULT 0,
    "housingAllowance" INTEGER NOT NULL DEFAULT 0,
    "familyAllowance" INTEGER NOT NULL DEFAULT 0,
    "otherAllowance" INTEGER NOT NULL DEFAULT 0,
    "otherAllowanceLabel" TEXT,
    "scheduledWorkDays" INTEGER NOT NULL DEFAULT 20,
    "scheduledWorkMinutes" INTEGER NOT NULL DEFAULT 480,
    "overtimeRate" DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    "lateNightRate" DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    "holidayRate" DECIMAL(4,2) NOT NULL DEFAULT 1.35,
    "bankName" TEXT,
    "bankCode" TEXT,
    "branchName" TEXT,
    "branchCode" TEXT,
    "accountType" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPayroll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalWorkMinutes" INTEGER NOT NULL DEFAULT 0,
    "scheduledMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateNightMinutes" INTEGER NOT NULL DEFAULT 0,
    "holidayMinutes" INTEGER NOT NULL DEFAULT 0,
    "workDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "basePay" INTEGER NOT NULL DEFAULT 0,
    "overtimePay" INTEGER NOT NULL DEFAULT 0,
    "lateNightPay" INTEGER NOT NULL DEFAULT 0,
    "holidayPay" INTEGER NOT NULL DEFAULT 0,
    "commuteAllowance" INTEGER NOT NULL DEFAULT 0,
    "otherAllowances" INTEGER NOT NULL DEFAULT 0,
    "grossPay" INTEGER NOT NULL DEFAULT 0,
    "deductions" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantHoliday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollConfig_tenantId_idx" ON "PayrollConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConfig_tenantId_userId_key" ON "PayrollConfig"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "MonthlyPayroll_tenantId_month_idx" ON "MonthlyPayroll"("tenantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPayroll_tenantId_userId_month_key" ON "MonthlyPayroll"("tenantId", "userId", "month");

-- CreateIndex
CREATE INDEX "TenantHoliday_tenantId_idx" ON "TenantHoliday"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantHoliday_tenantId_date_key" ON "TenantHoliday"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Department_tenantId_approverUserId_idx" ON "Department"("tenantId", "approverUserId");

-- CreateIndex
CREATE INDEX "FaceDescriptor_tenantId_idx" ON "FaceDescriptor"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_departmentId_idx" ON "User"("tenantId", "departmentId");

-- AddForeignKey
ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayroll" ADD CONSTRAINT "MonthlyPayroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayroll" ADD CONSTRAINT "MonthlyPayroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantHoliday" ADD CONSTRAINT "TenantHoliday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
