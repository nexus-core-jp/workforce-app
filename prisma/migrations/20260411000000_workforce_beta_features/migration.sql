-- Employment lifecycle, MFA recovery codes, onboarding wizard flag
-- Part of: workforce beta feature expansion (2026-04-11)

-- EmploymentType enum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'OUTSOURCED');

-- User table: employment lifecycle + MFA recovery
ALTER TABLE "User"
  ADD COLUMN "totpRecoveryCodes" JSONB,
  ADD COLUMN "hireDate" TIMESTAMP(3),
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ADD COLUMN "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME';

-- Tenant table: onboarding wizard progress
ALTER TABLE "Tenant"
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Existing tenants are considered onboarded (no need to show wizard retroactively)
UPDATE "Tenant" SET "onboardingCompleted" = true WHERE "createdAt" < NOW();
