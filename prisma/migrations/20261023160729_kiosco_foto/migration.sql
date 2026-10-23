-- CreateEnum
CREATE TYPE "AttendanceMarkType" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateTable
CREATE TABLE "KioskSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowedIps" TEXT NOT NULL DEFAULT '',
    "requirePhoto" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KioskSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePhoto" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "type" "AttendanceMarkType" NOT NULL,
    "data" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePhoto_attendanceId_idx" ON "AttendancePhoto"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePhoto_attendanceId_type_key" ON "AttendancePhoto"("attendanceId", "type");

-- AddForeignKey
ALTER TABLE "AttendancePhoto" ADD CONSTRAINT "AttendancePhoto_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
