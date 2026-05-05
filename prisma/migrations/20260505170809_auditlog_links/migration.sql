-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_entityId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_appointmentId_idx" ON "AuditLog"("tenantId", "appointmentId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
