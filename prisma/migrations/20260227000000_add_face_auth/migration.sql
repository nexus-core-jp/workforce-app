-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "faceAuthEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FaceDescriptor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descriptor" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceDescriptor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceDescriptor_tenantId_userId_idx" ON "FaceDescriptor"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "FaceDescriptor" ADD CONSTRAINT "FaceDescriptor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceDescriptor" ADD CONSTRAINT "FaceDescriptor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
