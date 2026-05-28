-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmailChangeVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "EmailChangeVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailChangeVerification_userId_idx" ON "EmailChangeVerification"("userId");

-- CreateIndex
CREATE INDEX "EmailChangeVerification_userId_createdAt_idx" ON "EmailChangeVerification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailChangeVerification_expiresAt_idx" ON "EmailChangeVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailChangeVerification" ADD CONSTRAINT "EmailChangeVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
