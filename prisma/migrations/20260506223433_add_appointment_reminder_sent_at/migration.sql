-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_tenantId_reminderSentAt_startTime_idx" ON "Appointment"("tenantId", "reminderSentAt", "startTime");
