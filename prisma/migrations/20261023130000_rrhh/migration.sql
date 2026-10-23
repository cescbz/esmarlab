-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RRHH';

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVO', 'INACTIVO', 'LICENCIA');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('MENSUAL', 'JORNAL', 'DESTAJO', 'MIXTO');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('RELOJ', 'MANUAL', 'CORRECCION');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('BORRADOR', 'CERRADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "PayrollType" AS ENUM ('MENSUAL', 'AGUINALDO');

-- CreateEnum
CREATE TYPE "VacationStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "workshopId" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVO',
    "payType" "PayType" NOT NULL,
    "monthlySalary" INTEGER,
    "dailyRate" INTEGER,
    "pieceRate" INTEGER,
    "scheduledStart" TEXT NOT NULL DEFAULT '07:30',
    "scheduledEnd" TEXT NOT NULL DEFAULT '17:00',
    "lunchMinutes" INTEGER NOT NULL DEFAULT 60,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "pinHash" TEXT NOT NULL,
    "vacationDaysOverride" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "source" "AttendanceSource" NOT NULL DEFAULT 'RELOJ',
    "notes" TEXT,
    "correctedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceworkEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitRate" INTEGER NOT NULL,
    "description" TEXT,
    "productionOrderStageId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceworkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "VacationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "VacationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "PayrollType" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'BORRADOR',
    "grossTotal" INTEGER NOT NULL DEFAULT 0,
    "ipsEmployeeTotal" INTEGER NOT NULL DEFAULT 0,
    "ipsEmployerTotal" INTEGER NOT NULL DEFAULT 0,
    "deductionsTotal" INTEGER NOT NULL DEFAULT 0,
    "netTotal" INTEGER NOT NULL DEFAULT 0,
    "extraTotal" INTEGER NOT NULL DEFAULT 0,
    "pieceTotal" INTEGER NOT NULL DEFAULT 0,
    "lateTotal" INTEGER NOT NULL DEFAULT 0,
    "absenceTotal" INTEGER NOT NULL DEFAULT 0,
    "vacationTotal" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethodId" TEXT,
    "paidFromCash" BOOLEAN NOT NULL DEFAULT false,
    "expenseId" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payType" "PayType" NOT NULL,
    "baseAmount" INTEGER NOT NULL DEFAULT 0,
    "workedDays" INTEGER NOT NULL DEFAULT 0,
    "pieceUnits" INTEGER NOT NULL DEFAULT 0,
    "pieceAmount" INTEGER NOT NULL DEFAULT 0,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "extraAmount" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateDeduction" INTEGER NOT NULL DEFAULT 0,
    "absenceDays" INTEGER NOT NULL DEFAULT 0,
    "absenceDeduction" INTEGER NOT NULL DEFAULT 0,
    "vacationDays" INTEGER NOT NULL DEFAULT 0,
    "vacationAmount" INTEGER NOT NULL DEFAULT 0,
    "otherEarnings" INTEGER NOT NULL DEFAULT 0,
    "otherDeductions" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" INTEGER NOT NULL DEFAULT 0,
    "ipsBase" INTEGER NOT NULL DEFAULT 0,
    "ipsEmployee" INTEGER NOT NULL DEFAULT 0,
    "ipsEmployer" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "concepts" JSONB,
    "notes" TEXT,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_ci_key" ON "Employee"("ci");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "PieceworkEntry_employeeId_date_idx" ON "PieceworkEntry"("employeeId", "date");

-- CreateIndex
CREATE INDEX "PieceworkEntry_productionOrderStageId_idx" ON "PieceworkEntry"("productionOrderStageId");

-- CreateIndex
CREATE INDEX "VacationRequest_employeeId_status_idx" ON "VacationRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "VacationRequest_startDate_endDate_idx" ON "VacationRequest"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_number_key" ON "PayrollPeriod"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_expenseId_key" ON "PayrollPeriod"("expenseId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_type_year_month_key" ON "PayrollPeriod"("type", "year", "month");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollId_employeeId_key" ON "PayrollItem"("payrollId", "employeeId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceworkEntry" ADD CONSTRAINT "PieceworkEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceworkEntry" ADD CONSTRAINT "PieceworkEntry_productionOrderStageId_fkey" FOREIGN KEY ("productionOrderStageId") REFERENCES "ProductionOrderStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationRequest" ADD CONSTRAINT "VacationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
