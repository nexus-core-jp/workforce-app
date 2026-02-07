/*
  Warnings:

  - Made the column `departmentId` on table `Close` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Close" ALTER COLUMN "departmentId" SET NOT NULL,
ALTER COLUMN "departmentId" SET DEFAULT '';
