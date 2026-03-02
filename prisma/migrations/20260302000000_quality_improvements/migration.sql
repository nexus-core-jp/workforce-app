-- Department.onDelete: SetNull for User.departmentId
-- Drop existing FK and re-create with ON DELETE SET NULL
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_departmentId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PasswordResetToken: add index on (userId, usedAt) for faster token lookup
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_usedAt_idx"
  ON "PasswordResetToken"("userId", "usedAt");
