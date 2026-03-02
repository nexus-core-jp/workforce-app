-- AlterTable
ALTER TABLE "User" ADD COLUMN "lineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_lineId_key" ON "User"("tenantId", "lineId");
