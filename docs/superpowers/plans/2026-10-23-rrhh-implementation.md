# Módulo RRHH — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a la demo de Esmar un módulo RRHH completo: empleados, reloj con PIN, asistencia, liquidaciones mensuales, destajo, aguinaldo, vacaciones y recibos PDF.

**Architecture:** Módulo nativo de Next.js App Router con Prisma/PostgreSQL. La lógica de cálculo vive en `src/lib/payroll.ts` como funciones puras y testeables; las server actions leen datos, llaman a esas funciones y guardan en transacciones. Las pantallas siguen los patrones existentes de tablas, modales, PDF.js y permisos por rol.

**Tech Stack:** Next.js 14, TypeScript estricto, Prisma 5, PostgreSQL 16, Zod, react-hook-form, TanStack Table, @react-pdf/renderer, bcryptjs, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-rrhh-design.md`

---

## Mapa de archivos

### Crear

- `src/lib/payroll.ts` — cálculos puros de jornada, liquidación, aguinaldo y vacaciones.
- `src/lib/hr.ts` — helpers de períodos, etiquetas y saldos de vacaciones.
- `src/lib/validators/employee.ts` — schema Zod de empleado.
- `src/lib/__tests__/payroll.test.ts` — tests de cálculos.
- `src/actions/hr.ts` — empleados y destajo.
- `src/actions/attendance.ts` — reloj y correcciones.
- `src/actions/payroll.ts` — períodos, cierre, pago y aguinaldo.
- `src/actions/vacations.ts` — solicitudes y decisiones.
- `src/lib/pdf/payroll-receipt-pdf.tsx` — recibo PDF.
- `src/app/api/pdf/recibo-sueldo/[id]/route.ts` — descarga.
- `src/app/(app)/ver/recibo-sueldo/[id]/page.tsx` — visor PDF.js.
- `src/app/(app)/rrhh/page.tsx` — panel RRHH.
- `src/app/(app)/rrhh/empleados/page.tsx`
- `src/app/(app)/rrhh/empleados/employees-table.tsx`
- `src/app/(app)/rrhh/empleados/employee-form-modal.tsx`
- `src/app/(app)/rrhh/empleados/employee-form.tsx`
- `src/app/(app)/rrhh/empleados/[id]/page.tsx`
- `src/app/(app)/rrhh/empleados/[id]/piecework-form-modal.tsx`
- `src/app/(app)/rrhh/reloj/page.tsx`
- `src/app/(app)/rrhh/reloj/clock-kiosk.tsx`
- `src/app/(app)/rrhh/asistencia/page.tsx`
- `src/app/(app)/rrhh/asistencia/attendance-period-selector.tsx`
- `src/app/(app)/rrhh/asistencia/attendance-summary-table.tsx`
- `src/app/(app)/rrhh/asistencia/[employeeId]/page.tsx`
- `src/app/(app)/rrhh/asistencia/[employeeId]/attendance-correction-dialog.tsx`
- `src/app/(app)/rrhh/liquidaciones/page.tsx`
- `src/app/(app)/rrhh/liquidaciones/new-payroll-dialog.tsx`
- `src/app/(app)/rrhh/liquidaciones/payrolls-table.tsx`
- `src/app/(app)/rrhh/liquidaciones/[id]/page.tsx`
- `src/app/(app)/rrhh/liquidaciones/[id]/payroll-actions.tsx`
- `src/app/(app)/rrhh/liquidaciones/[id]/payroll-items-table.tsx`
- `src/app/(app)/rrhh/liquidaciones/[id]/payroll-item-dialog.tsx`
- `src/app/(app)/rrhh/vacaciones/page.tsx`
- `src/app/(app)/rrhh/vacaciones/vacation-form-modal.tsx`
- `src/app/(app)/rrhh/vacaciones/vacation-requests-table.tsx`
- `src/app/(app)/rrhh/vacaciones/vacation-balances-table.tsx`
- `src/app/(app)/rrhh/aguinaldo/page.tsx`
- `src/app/(app)/rrhh/aguinaldo/aguinaldo-table.tsx`
- `src/app/(app)/rrhh/aguinaldo/generate-aguinaldo-button.tsx`
- `prisma/seed/hr.ts` — datos demo.
- `e2e/rrhh.spec.ts` — smoke E2E.

### Modificar

- `prisma/schema.prisma` — enums, modelos y relaciones inversas.
- `src/lib/roles.ts` — rol RRHH, accesos y PDF.
- `src/lib/codes.ts` — `nextEmployeeCode`.
- `src/components/layout/app-shell.tsx` — grupo RRHH y títulos.
- `prisma/seed.ts` — usuario `rrhh`, cleanup y llamada a `seedHR`.
- `src/app/(app)/page.tsx` — tarjeta "Planilla del mes".
- `AGENTS.md` — documentación del módulo.

---

## Task 1: Base de datos, rol RRHH, permisos y navegación

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/roles.ts`
- Modify: `src/lib/codes.ts`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `prisma/seed.ts`
- Test: comandos de Prisma

- [ ] **Step 1: Agregar el rol y los enums nuevos**

En `prisma/schema.prisma`, reemplazar el enum `Role` por:

```prisma
enum Role {
  ADMIN
  GERENCIA
  VENTAS
  CAJA
  DEPOSITO
  PRODUCCION
  RRHH
}

enum EmployeeStatus {
  ACTIVO
  INACTIVO
  LICENCIA
}

enum PayType {
  MENSUAL
  JORNAL
  DESTAJO
  MIXTO
}

enum AttendanceSource {
  RELOJ
  MANUAL
  CORRECCION
}

enum PayrollStatus {
  BORRADOR
  CERRADA
  PAGADA
  ANULADA
}

enum PayrollType {
  MENSUAL
  AGUINALDO
}

enum VacationStatus {
  PENDIENTE
  APROBADA
  RECHAZADA
  CANCELADA
}
```

- [ ] **Step 2: Agregar los modelos al final de `prisma/schema.prisma`**

```prisma
model Employee {
  id                   String         @id @default(cuid())
  code                 String         @unique
  firstName            String
  lastName             String
  ci                   String         @unique
  birthDate            DateTime?
  phone                String?
  email                String?
  address              String?
  emergencyContact     String?
  position             String
  department           String
  workshopId           String?
  workshop             Workshop?      @relation(fields: [workshopId], references: [id])
  hireDate             DateTime
  endDate              DateTime?
  status               EmployeeStatus @default(ACTIVO)
  payType              PayType
  monthlySalary        Int?
  dailyRate            Int?
  pieceRate            Int?
  scheduledStart       String         @default("07:30")
  scheduledEnd         String         @default("17:00")
  lunchMinutes         Int            @default(60)
  workDays             Int[]          @default([1, 2, 3, 4, 5, 6])
  lateToleranceMinutes Int            @default(10)
  pinHash              String
  vacationDaysOverride Int?
  notes                String?
  attendance           Attendance[]
  pieceworkEntries     PieceworkEntry[]
  vacationRequests     VacationRequest[]
  payrollItems         PayrollItem[]
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  @@index([status])
  @@index([department])
}

model Attendance {
  id                String           @id @default(cuid())
  employeeId        String
  employee          Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date              DateTime
  checkIn           DateTime?
  checkOut          DateTime?
  breakMinutes      Int              @default(0)
  lateMinutes       Int              @default(0)
  earlyLeaveMinutes Int              @default(0)
  overtimeMinutes   Int              @default(0)
  workedMinutes     Int              @default(0)
  lateCount         Int              @default(0)
  source            AttendanceSource @default(RELOJ)
  notes             String?
  correctedById     String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@unique([employeeId, date])
  @@index([date])
}

model PieceworkEntry {
  id                     String                @id @default(cuid())
  employeeId             String
  employee               Employee              @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date                   DateTime
  quantity               Int
  unitRate               Int
  description            String?
  productionOrderStageId String?
  productionOrderStage   ProductionOrderStage? @relation(fields: [productionOrderStageId], references: [id])
  createdById            String?
  createdAt              DateTime              @default(now())

  @@index([employeeId, date])
  @@index([productionOrderStageId])
}

model VacationRequest {
  id          String         @id @default(cuid())
  employeeId  String
  employee    Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate   DateTime
  endDate     DateTime
  days        Int
  status      VacationStatus @default(PENDIENTE)
  reason      String?
  requestedAt DateTime       @default(now())
  decidedAt   DateTime?
  decidedBy   String?
  notes       String?

  @@index([employeeId, status])
  @@index([startDate, endDate])
}

model PayrollPeriod {
  id               String         @id @default(cuid())
  number           String         @unique
  type             PayrollType
  year             Int
  month            Int
  startDate        DateTime
  endDate          DateTime
  status           PayrollStatus  @default(BORRADOR)
  grossTotal       Int            @default(0)
  ipsEmployeeTotal Int            @default(0)
  ipsEmployerTotal Int            @default(0)
  deductionsTotal  Int            @default(0)
  netTotal         Int            @default(0)
  extraTotal       Int            @default(0)
  pieceTotal       Int            @default(0)
  lateTotal        Int            @default(0)
  absenceTotal     Int            @default(0)
  vacationTotal    Int            @default(0)
  closedAt         DateTime?
  paidAt           DateTime?
  paymentMethodId  String?
  paymentMethod    PaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  paidFromCash     Boolean        @default(false)
  expenseId        String?        @unique
  expense          Expense?       @relation(fields: [expenseId], references: [id])
  notes            String?
  userId           String?
  items            PayrollItem[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([type, year, month])
  @@index([status])
}

model PayrollItem {
  id               String        @id @default(cuid())
  payrollId        String
  payroll          PayrollPeriod @relation(fields: [payrollId], references: [id], onDelete: Cascade)
  employeeId       String
  employee         Employee      @relation(fields: [employeeId], references: [id])
  payType          PayType
  baseAmount       Int           @default(0)
  workedDays       Int           @default(0)
  pieceUnits       Int           @default(0)
  pieceAmount      Int           @default(0)
  extraMinutes     Int           @default(0)
  extraAmount      Int           @default(0)
  lateMinutes      Int           @default(0)
  lateDeduction    Int           @default(0)
  absenceDays      Int           @default(0)
  absenceDeduction Int           @default(0)
  vacationDays     Int           @default(0)
  vacationAmount   Int           @default(0)
  otherEarnings    Int           @default(0)
  otherDeductions  Int           @default(0)
  grossAmount      Int           @default(0)
  ipsBase          Int           @default(0)
  ipsEmployee      Int           @default(0)
  ipsEmployer      Int           @default(0)
  netAmount        Int           @default(0)
  concepts         Json?
  notes            String?

  @@unique([payrollId, employeeId])
  @@index([employeeId])
}
```

- [ ] **Step 3: Agregar las relaciones inversas**

En los modelos existentes, agregar:

```prisma
model Workshop {
  // ...
  employees Employee[]
}

model ProductionOrderStage {
  // ...
  pieceworkEntries PieceworkEntry[]
}

model PaymentMethod {
  // ...
  payrollPeriods PayrollPeriod[]
}

model Expense {
  // ...
  payrollPeriod PayrollPeriod?
}
```

- [ ] **Step 4: Validar y migrar**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

Run: `npx prisma migrate dev --name rrhh`
Expected: migración creada y aplicada; `prisma generate` corre al final.

- [ ] **Step 5: Actualizar roles y permisos**

En `src/lib/roles.ts`:

```ts
export type AppRole =
  | "ADMIN"
  | "GERENCIA"
  | "VENTAS"
  | "CAJA"
  | "DEPOSITO"
  | "PRODUCCION"
  | "RRHH";

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  GERENCIA: "Gerencia",
  VENTAS: "Ventas",
  CAJA: "Caja",
  DEPOSITO: "Depósito",
  PRODUCCION: "Producción",
  RRHH: "Recursos Humanos",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  ADMIN: "Acceso total y configuración",
  GERENCIA: "Dashboard y reportes",
  VENTAS: "Clientes, presupuestos y pedidos",
  CAJA: "Caja, cobros y gastos",
  DEPOSITO: "Stock y compras",
  PRODUCCION: "Fichas técnicas y órdenes",
  RRHH: "Empleados, asistencia, liquidaciones y recibos",
};

export const ALL_ROLES: AppRole[] = [
  "ADMIN",
  "GERENCIA",
  "VENTAS",
  "CAJA",
  "DEPOSITO",
  "PRODUCCION",
  "RRHH",
];
```

En `ACCESS`, antes de `/reportes`:

```ts
{
  prefix: "/rrhh",
  roles: ["GERENCIA", "RRHH", "ADMIN"],
},
```

En `PdfKind`:

```ts
export type PdfKind = "presupuesto" | "kude" | "recibo" | "arqueo" | "xml" | "recibo-sueldo";
```

En `PDF_ACCESS`:

```ts
"recibo-sueldo": ["ADMIN", "GERENCIA", "RRHH"],
```

En `canWrite`, agregar el caso:

```ts
case "rrhh":
  return ["ADMIN", "RRHH"].includes(role);
```

- [ ] **Step 6: Agregar el código de legajo**

En `src/lib/codes.ts`:

```ts
export async function nextEmployeeCode(): Promise<string> {
  const rows = await prisma.employee.findMany({
    where: { code: { startsWith: "EMP-" } },
    select: { code: true },
  });
  return formatInternalCode("EMP", nextSequenceFromCodes("EMP", rows.map((row) => row.code)));
}
```

- [ ] **Step 7: Agregar navegación**

En `src/components/layout/app-shell.tsx`, agregar imports:

```tsx
import { CalendarDays, Clock, Gift, Palmtree } from "lucide-react";
```

Agregar el grupo después de Producción:

```tsx
{
  label: "RRHH",
  items: [
    { href: "/rrhh/empleados", label: "Empleados", icon: Users },
    { href: "/rrhh/reloj", label: "Reloj", icon: Clock },
    { href: "/rrhh/asistencia", label: "Asistencia", icon: CalendarDays },
    { href: "/rrhh/liquidaciones", label: "Liquidaciones", icon: Wallet },
    { href: "/rrhh/vacaciones", label: "Vacaciones", icon: Palmtree },
    { href: "/rrhh/aguinaldo", label: "Aguinaldo", icon: Gift },
  ],
},
```

En `TITLES`, antes de `/reportes`:

```ts
{ prefix: "/rrhh/empleados", title: "Empleados" },
{ prefix: "/rrhh/reloj", title: "Reloj de asistencia" },
{ prefix: "/rrhh/asistencia", title: "Asistencia" },
{ prefix: "/rrhh/liquidaciones", title: "Liquidaciones" },
{ prefix: "/rrhh/vacaciones", title: "Vacaciones" },
{ prefix: "/rrhh/aguinaldo", title: "Aguinaldo" },
{ prefix: "/rrhh", title: "Recursos Humanos" },
```

- [ ] **Step 8: Agregar estados al badge compartido**

En `src/components/shared/status-badge.tsx`, agregar a `STYLES` y `STATUS_LABELS`:

```ts
ACTIVO: "border-emerald-200 bg-emerald-50 text-emerald-700",
INACTIVO: "border-slate-200 bg-slate-100 text-slate-500",
LICENCIA: "border-amber-200 bg-amber-50 text-amber-700",
PAGADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
ANULADA: "border-slate-200 bg-slate-100 text-slate-500",
APROBADA: "border-emerald-200 bg-emerald-50 text-emerald-700",
```

```ts
ACTIVO: "Activo",
INACTIVO: "Inactivo",
LICENCIA: "Licencia",
PAGADA: "Pagada",
ANULADA: "Anulada",
APROBADA: "Aprobada",
```

- [ ] **Step 9: Agregar el usuario demo**

En `prisma/seed.ts`, dentro de `seedUsers()`:

```ts
{ username: "rrhh", name: "Patricia Ocampos", role: Role.RRHH },
```

- [ ] **Step 10: Verificar y commitear**

Run: `npm run lint`
Expected: sin errores.

```bash
git add prisma/schema.prisma prisma/migrations src/lib/roles.ts src/lib/codes.ts src/components/layout/app-shell.tsx src/components/shared/status-badge.tsx prisma/seed.ts
git commit -m "feat(rrhh): agrega esquema, rol y navegacion base"
```

---

## Task 2: Cálculos puros de RRHH (TDD)

**Files:**
- Create: `src/lib/__tests__/payroll.test.ts`
- Create: `src/lib/payroll.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/__tests__/payroll.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  aguinaldoAmount,
  buildPayrollItem,
  computeAttendance,
  countWorkdays,
  expectedWorkdays,
  isoWeekday,
  payrollTotals,
  vacationEntitlement,
  type PayrollEmployeeInput,
} from "@/lib/payroll";

const schedule = {
  scheduledStart: "07:30",
  scheduledEnd: "17:00",
  lunchMinutes: 60,
  workDays: [1, 2, 3, 4, 5],
  lateToleranceMinutes: 10,
};

const baseEmployee: PayrollEmployeeInput = {
  id: "emp_1",
  payType: "MENSUAL",
  monthlySalary: 5_500_000,
  dailyRate: null,
  pieceRate: null,
  hireDate: new Date("2016-03-12T12:00:00-03:00"),
  endDate: null,
  ...schedule,
};

function at(day: number, hour: number, minute = 0) {
  return new Date(`2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`);
}

function attendance(day: number, checkIn: Date | null, checkOut: Date | null, lateMinutes = 0, overtimeMinutes = 0) {
  return { date: at(day, 12), checkIn, checkOut, lateMinutes, overtimeMinutes };
}

describe("jornada y asistencia", () => {
  it("calcula el día de la semana ISO", () => {
    expect(isoWeekday(at(19, 12))).toBe(1);
    expect(isoWeekday(at(25, 12))).toBe(7);
  });

  it("no marca tardanza dentro de la tolerancia", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 7, 35),
      checkOut: at(19, 17, 5),
      schedule,
    });
    expect(result.lateMinutes).toBe(0);
    expect(result.workedMinutes).toBe(510);
    expect(result.overtimeMinutes).toBe(0);
  });

  it("marca tardanza y horas extras", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 7, 45),
      checkOut: at(19, 17, 30),
      schedule,
    });
    expect(result.lateMinutes).toBe(5);
    expect(result.lateCount).toBe(1);
    expect(result.workedMinutes).toBe(525);
    expect(result.overtimeMinutes).toBe(15);
  });

  it("considera día no laboral y paga todo como extra", () => {
    const result = computeAttendance({
      date: at(25, 12),
      checkIn: at(25, 8),
      checkOut: at(25, 12),
      schedule,
    });
    expect(result.isWorkday).toBe(false);
    expect(result.overtimeMinutes).toBe(240);
  });

  it("marca incompleta si falta la salida", () => {
    const result = computeAttendance({
      date: at(19, 12),
      checkIn: at(19, 8),
      checkOut: null,
      schedule,
    });
    expect(result.incomplete).toBe(true);
    expect(result.workedMinutes).toBe(0);
    expect(result.lateMinutes).toBe(20);
  });

  it("cuenta días laborales y días esperados", () => {
    expect(countWorkdays(new Date("2026-10-01T12:00:00-03:00"), new Date("2026-10-31T12:00:00-03:00"), [1, 2, 3, 4, 5, 6])).toBe(27);
    expect(expectedWorkdays({
      periodStart: new Date("2026-10-01T12:00:00-03:00"),
      periodEnd: new Date("2026-10-31T12:00:00-03:00"),
      hireDate: new Date("2026-10-15T12:00:00-03:00"),
      endDate: null,
      workDays: [1, 2, 3, 4, 5, 6],
      asOf: new Date("2026-10-31T12:00:00-03:00"),
    })).toBe(15);
  });
});

describe("vacaciones", () => {
  it("calcula días por antigüedad", () => {
    expect(vacationEntitlement(new Date("2016-03-12T12:00:00-03:00"), 2026)).toBe(30);
    expect(vacationEntitlement(new Date("2019-01-15T12:00:00-03:00"), 2026)).toBe(18);
    expect(vacationEntitlement(new Date("2024-08-01T12:00:00-03:00"), 2026)).toBe(12);
    expect(vacationEntitlement(new Date("2026-03-01T12:00:00-03:00"), 2026)).toBe(9);
  });

  it("respeta el override", () => {
    expect(vacationEntitlement(new Date("2024-08-01T12:00:00-03:00"), 2026, 20)).toBe(20);
  });
});

describe("liquidación mensual", () => {
  it("calcula sueldo, tardanza, ausencia, extra e IPS", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [
        attendance(19, at(19, 7, 45), at(19, 18, 15), 5, 60),
        attendance(20, at(20, 7, 30), at(20, 17), 0, 0),
        attendance(21, at(21, 7, 30), at(21, 17), 0, 0),
        attendance(22, at(22, 7, 30), at(22, 17), 0, 0),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.workedDays).toBe(4);
    expect(item.absenceDays).toBe(1);
    expect(item.baseAmount).toBe(5_500_000);
    expect(item.extraAmount).toBe(32_353);
    expect(item.lateDeduction).toBe(1_797);
    expect(item.absenceDeduction).toBe(183_333);
    expect(item.grossAmount).toBe(5_532_353);
    expect(item.ipsEmployee).toBe(497_912);
    expect(item.netAmount).toBe(4_849_311);
  });

  it("calcula jornal y vacaciones pagas", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "JORNAL", monthlySalary: null, dailyRate: 150_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
      pieces: [],
      vacationDays: 1,
    });
    expect(item.baseAmount).toBe(600_000);
    expect(item.vacationAmount).toBe(150_000);
    expect(item.grossAmount).toBe(750_000);
    expect(item.ipsEmployee).toBe(67_500);
    expect(item.netAmount).toBe(682_500);
  });

  it("calcula destajo por unidades", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "DESTAJO", monthlySalary: null, dailyRate: 150_000, pieceRate: 12_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
      pieces: [{ quantity: 500, unitRate: 12_000 }],
      vacationDays: 0,
    });
    expect(item.baseAmount).toBe(6_000_000);
    expect(item.grossAmount).toBe(6_000_000);
    expect(item.ipsEmployee).toBe(540_000);
    expect(item.netAmount).toBe(5_460_000);
  });

  it("calcula mixto con sueldo y destajo", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "MIXTO", monthlySalary: 3_200_000, pieceRate: 6_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
      pieces: [{ quantity: 400, unitRate: 6_000 }],
      vacationDays: 0,
    });
    expect(item.baseAmount).toBe(5_600_000);
    expect(item.grossAmount).toBe(5_600_000);
    expect(item.ipsEmployee).toBe(504_000);
    expect(item.netAmount).toBe(5_096_000);
  });

  it("paga al 100% las horas en día no laboral", () => {
    const item = buildPayrollItem({
      employee: { ...baseEmployee, payType: "JORNAL", monthlySalary: null, dailyRate: 150_000 },
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-25T23:59:59-03:00"),
      asOf: new Date("2026-10-25T23:59:59-03:00"),
      attendance: [
        ...[19, 20, 21, 22, 23].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
        attendance(25, at(25, 8), at(25, 12), 0, 240),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.extraMinutes).toBe(240);
    expect(item.extraAmount).toBe(141_176);
    expect(item.grossAmount).toBe(891_176);
    expect(item.netAmount).toBe(810_970);
  });

  it("topa el descuento por tardanza a un día", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [
        attendance(19, at(19, 7, 30), at(19, 17), 1_000, 0),
        attendance(20, at(20, 7, 30), at(20, 17), 0, 0),
        attendance(21, at(21, 7, 30), at(21, 17), 0, 0),
        attendance(22, at(22, 7, 30), at(22, 17), 0, 0),
        attendance(23, at(23, 7, 30), at(23, 17), 0, 0),
      ],
      pieces: [],
      vacationDays: 0,
    });
    expect(item.lateDeduction).toBe(183_333);
  });

  it("permite detectar un neto negativo", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
      pieces: [],
      vacationDays: 0,
      otherDeductions: 9_000_000,
    });
    expect(item.netAmount).toBeLessThan(0);
  });

  it("suma totales del período", () => {
    const item = buildPayrollItem({
      employee: baseEmployee,
      periodStart: new Date("2026-10-19T12:00:00-03:00"),
      periodEnd: new Date("2026-10-23T23:59:59-03:00"),
      asOf: new Date("2026-10-23T23:59:59-03:00"),
      attendance: [19, 20, 21, 22, 23].map((day) => attendance(day, at(day, 7, 30), at(day, 17), 0, 0)),
      pieces: [],
      vacationDays: 0,
    });
    expect(payrollTotals([item]).netTotal).toBe(item.netAmount);
  });
});

describe("aguinaldo", () => {
  it("calcula 1/12 de lo ganado", () => {
    expect(aguinaldoAmount(60_000_000)).toBe(5_000_000);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- src/lib/__tests__/payroll.test.ts`
Expected: FAIL porque `@/lib/payroll` no existe.

- [ ] **Step 3: Implementar `src/lib/payroll.ts`**

```ts
export const PAYROLL_TZ = "America/Asuncion";

export type PayTypeValue = "MENSUAL" | "JORNAL" | "DESTAJO" | "MIXTO";

export type ScheduleInput = {
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
};

export type AttendanceLike = {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  lateMinutes: number;
  overtimeMinutes: number;
};

export type PieceworkLike = {
  quantity: number;
  unitRate: number;
};

export type PayrollEmployeeInput = {
  id: string;
  payType: PayTypeValue;
  monthlySalary: number | null;
  dailyRate: number | null;
  pieceRate: number | null;
  hireDate: Date;
  endDate: Date | null;
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
};

export type BuildPayrollItemInput = {
  employee: PayrollEmployeeInput;
  periodStart: Date;
  periodEnd: Date;
  asOf?: Date;
  attendance: AttendanceLike[];
  pieces: PieceworkLike[];
  vacationDays: number;
  otherEarnings?: number;
  otherDeductions?: number;
  notes?: string | null;
};

export type PayrollItemComputation = {
  payType: PayTypeValue;
  baseAmount: number;
  workedDays: number;
  pieceUnits: number;
  pieceAmount: number;
  extraMinutes: number;
  extraAmount: number;
  lateMinutes: number;
  lateDeduction: number;
  absenceDays: number;
  absenceDeduction: number;
  vacationDays: number;
  vacationAmount: number;
  otherEarnings: number;
  otherDeductions: number;
  grossAmount: number;
  ipsBase: number;
  ipsEmployee: number;
  ipsEmployer: number;
  netAmount: number;
  concepts: Record<string, unknown>;
  notes: string | null;
};

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00-03:00`);
}

function addDaysToKey(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function weekdayFromKey(key: string): number {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function dateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

function fullMonthsBetween(from: Date, to: Date): number {
  const a = dateParts(from);
  const b = dateParts(to);
  let months = (b.year - a.year) * 12 + (b.month - a.month);
  if (b.day < a.day) months -= 1;
  return Math.max(0, months);
}

export function minutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PAYROLL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isoWeekday(date: Date): number {
  return weekdayFromKey(dateKey(date));
}

export function isWorkday(date: Date, workDays: number[]): boolean {
  return workDays.includes(isoWeekday(date));
}

export function scheduledMinutes(schedule: Pick<ScheduleInput, "scheduledStart" | "scheduledEnd" | "lunchMinutes">): number {
  return Math.max(
    0,
    parseTimeToMinutes(schedule.scheduledEnd) - parseTimeToMinutes(schedule.scheduledStart) - schedule.lunchMinutes
  );
}

export type AttendanceComputation = {
  isWorkday: boolean;
  lateMinutes: number;
  lateCount: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  incomplete: boolean;
};

export function computeAttendance(input: {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  schedule: ScheduleInput;
}): AttendanceComputation {
  const { date, checkIn, checkOut, schedule } = input;
  const workday = isWorkday(date, schedule.workDays);
  const start = parseTimeToMinutes(schedule.scheduledStart);
  const end = parseTimeToMinutes(schedule.scheduledEnd);
  const scheduled = scheduledMinutes(schedule);

  if (!checkIn) {
    return {
      isWorkday: workday,
      lateMinutes: 0,
      lateCount: 0,
      earlyLeaveMinutes: 0,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      incomplete: true,
    };
  }

  const inMinutes = minutesOfDay(checkIn);
  const lateMinutes = workday ? Math.max(0, inMinutes - (start + schedule.lateToleranceMinutes)) : 0;

  if (!checkOut) {
    return {
      isWorkday: workday,
      lateMinutes,
      lateCount: lateMinutes > 0 ? 1 : 0,
      earlyLeaveMinutes: 0,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      incomplete: true,
    };
  }

  const outMinutes = minutesOfDay(checkOut);
  const span = Math.max(0, outMinutes - inMinutes);
  const breakMinutes = span > 360 ? schedule.lunchMinutes : 0;
  const workedMinutes = Math.max(0, span - breakMinutes);
  const earlyLeaveMinutes = workday ? Math.max(0, end - outMinutes) : 0;
  const overtimeMinutes = workday ? Math.max(0, workedMinutes - scheduled) : workedMinutes;

  return {
    isWorkday: workday,
    lateMinutes,
    lateCount: lateMinutes > 0 ? 1 : 0,
    earlyLeaveMinutes,
    breakMinutes,
    workedMinutes,
    overtimeMinutes,
    incomplete: false,
  };
}

export function countWorkdays(start: Date, end: Date, workDays: number[]): number {
  const from = dateKey(start);
  const to = dateKey(end);
  if (from > to) return 0;
  let count = 0;
  let cursor = from;
  while (cursor <= to) {
    if (workDays.includes(weekdayFromKey(cursor))) count += 1;
    cursor = addDaysToKey(cursor, 1);
  }
  return count;
}

export function expectedWorkdays(input: {
  periodStart: Date;
  periodEnd: Date;
  hireDate: Date;
  endDate: Date | null;
  workDays: number[];
  asOf?: Date;
}): number {
  const from = [dateKey(input.periodStart), dateKey(input.hireDate)].sort().at(-1) as string;
  const candidates = [dateKey(input.periodEnd)];
  if (input.endDate) candidates.push(dateKey(input.endDate));
  if (input.asOf) candidates.push(dateKey(input.asOf));
  const to = candidates.sort()[0];
  if (from > to) return 0;
  return countWorkdays(dateFromKey(from), dateFromKey(to), input.workDays);
}

export function vacationEntitlement(hireDate: Date, year: number, override?: number | null): number {
  if (override !== null && override !== undefined) return Math.max(0, override);
  const end = dateFromKey(`${year}-12-31`);
  if (dateKey(hireDate) > dateKey(end)) return 0;
  const months = fullMonthsBetween(hireDate, end);
  const years = Math.floor(months / 12);
  if (years >= 10) return 30;
  if (years >= 5) return 18;
  if (years >= 1) return 12;
  return Math.min(12, months);
}

export function countVacationDays(start: Date, end: Date, workDays: number[]): number {
  return countWorkdays(start, end, workDays);
}

export function buildPayrollItem(input: BuildPayrollItemInput): PayrollItemComputation {
  const { employee } = input;
  const schedule: ScheduleInput = {
    scheduledStart: employee.scheduledStart,
    scheduledEnd: employee.scheduledEnd,
    lunchMinutes: employee.lunchMinutes,
    workDays: employee.workDays,
    lateToleranceMinutes: employee.lateToleranceMinutes,
  };
  const scheduleMins = scheduledMinutes(schedule);
  const expected = expectedWorkdays({
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    hireDate: employee.hireDate,
    endDate: employee.endDate,
    workDays: employee.workDays,
    asOf: input.asOf,
  });

  const complete = input.attendance.filter((record) => record.checkIn && record.checkOut);
  const workedDays = complete.filter((record) => isWorkday(record.date, employee.workDays)).length;
  const lateMinutes = input.attendance.reduce((sum, record) => sum + record.lateMinutes, 0);
  const workdayExtraMinutes = input.attendance
    .filter((record) => isWorkday(record.date, employee.workDays))
    .reduce((sum, record) => sum + record.overtimeMinutes, 0);
  const nonWorkdayExtraMinutes = input.attendance
    .filter((record) => !isWorkday(record.date, employee.workDays))
    .reduce((sum, record) => sum + record.overtimeMinutes, 0);
  const extraMinutes = workdayExtraMinutes + nonWorkdayExtraMinutes;
  const pieceUnits = input.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
  const pieceAmount = input.pieces.reduce((sum, piece) => sum + piece.quantity * piece.unitRate, 0);
  const vacationDays = Math.max(0, input.vacationDays);
  const absenceDays = Math.max(0, expected - workedDays - vacationDays);

  const monthly = employee.monthlySalary ?? 0;
  const daily = employee.dailyRate ?? 0;
  const dailyForDeduction = employee.payType === "MENSUAL" || employee.payType === "MIXTO" ? monthly / 30 : daily;
  const hourly = scheduleMins > 0
    ? (employee.payType === "MENSUAL" || employee.payType === "MIXTO"
        ? monthly / 30 / (scheduleMins / 60)
        : daily / (scheduleMins / 60))
    : 0;

  let baseAmount = 0;
  let vacationAmount = 0;

  if (employee.payType === "MENSUAL") {
    baseAmount = monthly;
  } else if (employee.payType === "JORNAL") {
    baseAmount = daily * workedDays;
    vacationAmount = daily * vacationDays;
  } else if (employee.payType === "DESTAJO") {
    baseAmount = pieceAmount;
    vacationAmount = daily * vacationDays;
  } else {
    baseAmount = monthly + pieceAmount;
  }

  const extraAmount = Math.round((hourly * (workdayExtraMinutes * 1.5 + nonWorkdayExtraMinutes * 2)) / 60);
  const lateDeduction = scheduleMins > 0 && dailyForDeduction > 0
    ? Math.min(Math.round(dailyForDeduction), Math.round((dailyForDeduction / scheduleMins) * lateMinutes))
    : 0;
  const absenceDeduction =
    employee.payType === "MENSUAL" || employee.payType === "MIXTO"
      ? Math.round((monthly / 30) * absenceDays)
      : employee.payType === "JORNAL"
        ? daily * absenceDays
        : 0;

  const otherEarnings = Math.max(0, input.otherEarnings ?? 0);
  const otherDeductions = Math.max(0, input.otherDeductions ?? 0);
  const grossAmount = baseAmount + vacationAmount + extraAmount + otherEarnings;
  const ipsBase = grossAmount;
  const ipsEmployee = Math.round(ipsBase * 0.09);
  const ipsEmployer = Math.round(ipsBase * 0.165);
  const netAmount = grossAmount - lateDeduction - absenceDeduction - ipsEmployee - otherDeductions;

  return {
    payType: employee.payType,
    baseAmount,
    workedDays,
    pieceUnits,
    pieceAmount,
    extraMinutes,
    extraAmount,
    lateMinutes,
    lateDeduction,
    absenceDays,
    absenceDeduction,
    vacationDays,
    vacationAmount,
    otherEarnings,
    otherDeductions,
    grossAmount,
    ipsBase,
    ipsEmployee,
    ipsEmployer,
    netAmount,
    concepts: {
      scheduledMinutes: scheduleMins,
      hourlyRate: Math.round(hourly),
      dailyRateForDeduction: Math.round(dailyForDeduction),
      workdayExtraMinutes,
      nonWorkdayExtraMinutes,
      expectedWorkdays: expected,
    },
    notes: input.notes ?? null,
  };
}

export function aguinaldoAmount(totalEarned: number): number {
  return Math.round(Math.max(0, totalEarned) / 12);
}

export function payrollTotals(items: PayrollItemComputation[]) {
  return items.reduce(
    (acc, item) => ({
      grossTotal: acc.grossTotal + item.grossAmount,
      ipsEmployeeTotal: acc.ipsEmployeeTotal + item.ipsEmployee,
      ipsEmployerTotal: acc.ipsEmployerTotal + item.ipsEmployer,
      deductionsTotal:
        acc.deductionsTotal + item.lateDeduction + item.absenceDeduction + item.ipsEmployee + item.otherDeductions,
      netTotal: acc.netTotal + item.netAmount,
      extraTotal: acc.extraTotal + item.extraAmount,
      pieceTotal: acc.pieceTotal + item.pieceAmount,
      lateTotal: acc.lateTotal + item.lateDeduction,
      absenceTotal: acc.absenceTotal + item.absenceDeduction,
      vacationTotal: acc.vacationTotal + item.vacationAmount,
    }),
    {
      grossTotal: 0,
      ipsEmployeeTotal: 0,
      ipsEmployerTotal: 0,
      deductionsTotal: 0,
      netTotal: 0,
      extraTotal: 0,
      pieceTotal: 0,
      lateTotal: 0,
      absenceTotal: 0,
      vacationTotal: 0,
    }
  );
}
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- src/lib/__tests__/payroll.test.ts`
Expected: PASS.

- [ ] **Step 5: Commitear**

```bash
git add src/lib/payroll.ts src/lib/__tests__/payroll.test.ts
git commit -m "feat(rrhh): agrega calculos de jornada, liquidacion y aguinaldo"
```

---

## Task 3: Helpers, validadores, empleados y destajo

**Files:**
- Create: `src/lib/hr.ts`
- Create: `src/lib/validators/employee.ts`
- Create: `src/actions/hr.ts`
- Create: `src/app/(app)/rrhh/empleados/page.tsx`
- Create: `src/app/(app)/rrhh/empleados/employees-table.tsx`
- Create: `src/app/(app)/rrhh/empleados/employee-form-modal.tsx`
- Create: `src/app/(app)/rrhh/empleados/employee-form.tsx`
- Create: `src/app/(app)/rrhh/empleados/[id]/page.tsx`
- Create: `src/app/(app)/rrhh/empleados/[id]/piecework-form-modal.tsx`

- [ ] **Step 1: Crear helpers de períodos y saldos**

`src/lib/hr.ts`:

```ts
import { countVacationDays, vacationEntitlement } from "@/lib/payroll";

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function periodRange(year: number, month: number) {
  const padded = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: new Date(`${year}-${padded}-01T00:00:00-03:00`),
    end: new Date(`${year}-${padded}-${String(lastDay).padStart(2, "0")}T23:59:59-03:00`),
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    number: `LIQ-${year}-${padded}`,
  };
}

export function currentPeriod() {
  const now = new Date();
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric" }).format(now));
  const month = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", month: "2-digit" }).format(now));
  return { year, month };
}

function overlapsYear(request: { startDate: Date; endDate: Date }, year: number) {
  const start = new Date(`${year}-01-01T00:00:00-03:00`);
  const end = new Date(`${year}-12-31T23:59:59-03:00`);
  return request.startDate <= end && request.endDate >= start;
}

export function vacationBalance(input: {
  hireDate: Date;
  year: number;
  override?: number | null;
  requests: { days: number; status: string; startDate: Date; endDate: Date }[];
}) {
  const entitlement = vacationEntitlement(input.hireDate, input.year, input.override);
  const taken = input.requests
    .filter((request) => request.status === "APROBADA" && overlapsYear(request, input.year))
    .reduce((sum, request) => sum + request.days, 0);
  const pending = input.requests
    .filter((request) => request.status === "PENDIENTE" && overlapsYear(request, input.year))
    .reduce((sum, request) => sum + request.days, 0);
  return { entitlement, taken, pending, available: Math.max(0, entitlement - taken) };
}

export { countVacationDays };
```

- [ ] **Step 2: Crear el schema de empleado**

`src/lib/validators/employee.ts`:

```ts
import { z } from "zod";
import { isValidRuc } from "@/lib/fiscal";

const timeRegex = /^\d{2}:\d{2}$/;
const optionalAmount = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().int().min(0).nullable()
);

export const employeeSchema = z
  .object({
    firstName: z.string().min(2, "Ingresá el nombre."),
    lastName: z.string().min(2, "Ingresá el apellido."),
    ci: z.string().min(1, "Ingresá la CI.").refine((value) => isValidRuc(value), "CI inválida. Verificá el dígito verificador."),
    birthDate: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    email: z.string().optional().default("").refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email inválido."),
    address: z.string().optional().default(""),
    emergencyContact: z.string().optional().default(""),
    position: z.string().min(2, "Ingresá el cargo."),
    department: z.string().min(2, "Ingresá el departamento."),
    workshopId: z.string().optional().default(""),
    hireDate: z.string().min(1, "Seleccioná la fecha de ingreso."),
    endDate: z.string().optional().default(""),
    status: z.enum(["ACTIVO", "INACTIVO", "LICENCIA"]).default("ACTIVO"),
    payType: z.enum(["MENSUAL", "JORNAL", "DESTAJO", "MIXTO"]),
    monthlySalary: optionalAmount,
    dailyRate: optionalAmount,
    pieceRate: optionalAmount,
    scheduledStart: z.string().regex(timeRegex, "Hora de entrada inválida."),
    scheduledEnd: z.string().regex(timeRegex, "Hora de salida inválida."),
    lunchMinutes: z.coerce.number().int().min(0).max(240),
    lateToleranceMinutes: z.coerce.number().int().min(0).max(120),
    workDays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Seleccioná al menos un día."),
    pin: z.string().optional().default(""),
    vacationDaysOverride: optionalAmount,
    notes: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledEnd <= data.scheduledStart) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledEnd"], message: "La salida debe ser posterior a la entrada." });
    }
    if ((data.payType === "MENSUAL" || data.payType === "MIXTO") && !data.monthlySalary) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthlySalary"], message: "Ingresá el sueldo mensual." });
    }
    if (data.payType === "JORNAL" && !data.dailyRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dailyRate"], message: "Ingresá el jornal diario." });
    }
    if ((data.payType === "DESTAJO" || data.payType === "MIXTO") && !data.pieceRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pieceRate"], message: "Ingresá la tarifa por unidad." });
    }
    if (data.pin && !/^\d{4}$/.test(data.pin)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pin"], message: "El PIN debe tener 4 dígitos." });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
```

- [ ] **Step 3: Crear las acciones de empleados y destajo**

`src/actions/hr.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { employeeSchema } from "@/lib/validators/employee";
import { isValidRuc, onlyDigits } from "@/lib/fiscal";
import { nextEmployeeCode } from "@/lib/codes";
import type { ActionResult } from "./customers";

function parseCi(ci: string) {
  const [base, dv] = ci.replace(/\s/g, "").split("-");
  return `${onlyDigits(base ?? "")}-${onlyDigits(dv ?? "")}`;
}

export async function saveEmployee(values: unknown, employeeId?: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar empleados." };
  }
  const parsed = employeeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  if (!isValidRuc(data.ci)) return { ok: false, error: "CI inválida. Verificá el dígito verificador." };
  if (!employeeId && !/^\d{4}$/.test(data.pin)) return { ok: false, error: "Ingresá un PIN de 4 dígitos para el empleado." };

  const ci = parseCi(data.ci);
  const duplicate = await prisma.employee.findFirst({
    where: { ci, ...(employeeId ? { id: { not: employeeId } } : {}) },
    select: { id: true, firstName: true, lastName: true },
  });
  if (duplicate) return { ok: false, error: `Ya existe un empleado con esa CI: ${duplicate.firstName} ${duplicate.lastName}.` };

  const payload = {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    ci,
    birthDate: data.birthDate ? new Date(`${data.birthDate}T12:00:00-03:00`) : null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    emergencyContact: data.emergencyContact || null,
    position: data.position.trim(),
    department: data.department.trim(),
    workshopId: data.workshopId || null,
    hireDate: new Date(`${data.hireDate}T12:00:00-03:00`),
    endDate: data.endDate ? new Date(`${data.endDate}T12:00:00-03:00`) : null,
    status: data.status,
    payType: data.payType,
    monthlySalary: data.monthlySalary,
    dailyRate: data.dailyRate,
    pieceRate: data.pieceRate,
    scheduledStart: data.scheduledStart,
    scheduledEnd: data.scheduledEnd,
    lunchMinutes: data.lunchMinutes,
    workDays: data.workDays,
    lateToleranceMinutes: data.lateToleranceMinutes,
    vacationDaysOverride: data.vacationDaysOverride,
    notes: data.notes || null,
  };

  try {
    if (employeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { ...payload, ...(data.pin ? { pinHash: await bcrypt.hash(data.pin, 10) } : {}) },
      });
      revalidatePath("/rrhh/empleados");
      revalidatePath(`/rrhh/empleados/${employeeId}`);
      revalidatePath("/rrhh");
      return { ok: true, id: employeeId };
    }
    const employee = await prisma.employee.create({
      data: { ...payload, code: await nextEmployeeCode(), pinHash: await bcrypt.hash(data.pin, 10) },
    });
    revalidatePath("/rrhh/empleados");
    revalidatePath("/rrhh");
    return { ok: true, id: employee.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el empleado. Intentá nuevamente." };
  }
}

export async function setEmployeeStatus(employeeId: string, status: "ACTIVO" | "INACTIVO" | "LICENCIA"): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cambiar el estado del empleado." };
  }
  await prisma.employee.update({ where: { id: employeeId }, data: { status } });
  revalidatePath("/rrhh/empleados");
  revalidatePath(`/rrhh/empleados/${employeeId}`);
  return { ok: true, id: employeeId };
}

const pieceworkSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitRate: z.coerce.number().int().min(0),
  description: z.string().optional().default(""),
  productionOrderStageId: z.string().optional().default(""),
});

export async function savePieceworkEntry(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar destajo." };
  }
  const parsed = pieceworkSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  await prisma.pieceworkEntry.create({
    data: {
      employeeId: data.employeeId,
      date: new Date(`${data.date}T12:00:00-03:00`),
      quantity: data.quantity,
      unitRate: data.unitRate,
      description: data.description || null,
      productionOrderStageId: data.productionOrderStageId || null,
      createdById: session.user.username,
    },
  });
  revalidatePath(`/rrhh/empleados/${data.employeeId}`);
  revalidatePath("/rrhh");
  return { ok: true };
}
```

- [ ] **Step 4: Crear la tabla de empleados**

`src/app/(app)/rrhh/empleados/employees-table.tsx`:

```tsx
"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";

const PAY_LABELS: Record<string, string> = {
  MENSUAL: "Mensual",
  JORNAL: "Jornal",
  DESTAJO: "Destajo",
  MIXTO: "Mixto",
};

export type EmployeeRow = {
  id: string;
  code: string;
  name: string;
  ci: string;
  position: string;
  department: string;
  payType: string;
  payDetail: string;
  hireDate: string;
  status: string;
};

const columns: ColumnDef<EmployeeRow, unknown>[] = [
  { accessorKey: "code", header: "Legajo", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.code}</span> },
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => (
      <div>
        <Link href={`/rrhh/empleados/${row.original.id}`} className="text-xs font-semibold hover:text-primary hover:underline">{row.original.name}</Link>
        <p className="text-[10px] text-muted-foreground">CI {row.original.ci}</p>
      </div>
    ),
  },
  { accessorKey: "position", header: "Cargo", cell: ({ row }) => <div><p className="text-xs">{row.original.position}</p><p className="text-[10px] text-muted-foreground">{row.original.department}</p></div> },
  { accessorKey: "payType", header: "Tipo", cell: ({ row }) => <Badge variant="outline" className="text-[10px]">{PAY_LABELS[row.original.payType] ?? row.original.payType}</Badge> },
  { accessorKey: "payDetail", header: "Remuneración", cell: ({ row }) => <span className="text-xs tabular">{row.original.payDetail}</span> },
  { accessorKey: "hireDate", header: "Ingreso", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{row.original.hireDate}</span> },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export function EmployeesTable({ data }: { data: EmployeeRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKeys={["code", "name", "ci", "position", "department", "payType"]}
      searchPlaceholder="Buscar por legajo, nombre, CI o cargo…"
      pageSize={15}
      emptyMessage="No hay empleados que coincidan con la búsqueda."
    />
  );
}
```

- [ ] **Step 5: Crear el formulario y el modal**

`employee-form.tsx` debe seguir el patrón de `src/app/(app)/caja/expense-form.tsx`: `useForm` + `zodResolver(employeeSchema)`, `useTransition`, toast, `saveEmployee(values, employee?.id)`, `router.refresh()` y `onSaved?.()`.

Campos exactos:

- Personales: `firstName`, `lastName`, `ci`, `birthDate` (DatePicker), `phone`, `email`, `address`, `emergencyContact`.
- Laborales: `position`, `department` (Select con Producción, Ventas, Administración, Depósito, Gerencia, RRHH), `workshopId` (Select con talleres + "Sin taller"), `hireDate` (DatePicker), `endDate` (DatePicker), `status` (Select Activo/Licencia/Inactivo).
- Horario: `scheduledStart` y `scheduledEnd` (`Input type="time"`), `lunchMinutes`, `lateToleranceMinutes`, `workDays` (botones Lun–Dom con `Controller`).
- Pago: `payType` (Select), `monthlySalary` (visible para MENSUAL/MIXTO), `dailyRate` (visible para JORNAL/DESTAJO; label "Jornal de referencia" en DESTAJO), `pieceRate` (visible para DESTAJO/MIXTO), `vacationDaysOverride`, `pin` (`type="password"`, 4 dígitos; en edición es opcional), `notes`.

`employee-form-modal.tsx`:

```tsx
"use client";

import { FormDialog } from "@/components/shared/form-dialog";
import { EmployeeForm, type EmployeeDefaults } from "./employee-form";

export function EmployeeFormModal({
  employee,
  workshops,
  trigger,
}: {
  employee?: EmployeeDefaults;
  workshops: { id: string; name: string }[];
  trigger?: React.ReactNode;
}) {
  return (
    <FormDialog
      title={employee?.id ? "Editar empleado" : "Nuevo empleado"}
      description="Ficha, horario, forma de pago y PIN para el reloj."
      trigger={trigger}
    >
      {(close) => <EmployeeForm employee={employee} workshops={workshops} onSaved={close} />}
    </FormDialog>
  );
}
```

- [ ] **Step 6: Crear la página de empleados**

`page.tsx`:

```tsx
import type { Metadata } from "next";
import { Plus, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/shared/kpi-card";
import { formatDate, formatGs } from "@/lib/format";
import { EmployeeFormModal } from "./employee-form-modal";
import { EmployeesTable, type EmployeeRow } from "./employees-table";

export const metadata: Metadata = { title: "Empleados" };

function payDetail(employee: { payType: string; monthlySalary: number | null; dailyRate: number | null; pieceRate: number | null }) {
  if (employee.payType === "MENSUAL") return formatGs(employee.monthlySalary ?? 0);
  if (employee.payType === "JORNAL") return `${formatGs(employee.dailyRate ?? 0)}/día`;
  if (employee.payType === "DESTAJO") return `${formatGs(employee.pieceRate ?? 0)}/unidad`;
  return `${formatGs(employee.monthlySalary ?? 0)} + ${formatGs(employee.pieceRate ?? 0)}/unidad`;
}

export default async function EmployeesPage() {
  const [employees, workshops] = await Promise.all([
    prisma.employee.findMany({ orderBy: { code: "asc" } }),
    prisma.workshop.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const rows: EmployeeRow[] = employees.map((employee) => ({
    id: employee.id,
    code: employee.code,
    name: `${employee.firstName} ${employee.lastName}`,
    ci: employee.ci,
    position: employee.position,
    department: employee.department,
    payType: employee.payType,
    payDetail: payDetail(employee),
    hireDate: formatDate(employee.hireDate),
    status: employee.status,
  }));
  const active = employees.filter((employee) => employee.status === "ACTIVO").length;
  const monthly = employees.filter((employee) => employee.payType === "MENSUAL").length;
  const byHour = employees.filter((employee) => employee.payType === "JORNAL").length;
  const piece = employees.filter((employee) => employee.payType === "DESTAJO" || employee.payType === "MIXTO").length;

  return (
    <div>
      <PageHeader
        title="Empleados"
        description="Fichas, horarios, formas de pago y PIN del reloj."
        actions={<EmployeeFormModal workshops={workshops} trigger={<Button><Plus className="mr-1.5 h-4 w-4" />Nuevo empleado</Button>} />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Empleados activos" value={String(active)} icon={UsersRound} tone="accent" />
        <KpiCard label="Mensuales" value={String(monthly)} icon={UsersRound} />
        <KpiCard label="Jornaleros" value={String(byHour)} icon={UsersRound} />
        <KpiCard label="Destajo / mixto" value={String(piece)} icon={UsersRound} />
      </div>
      <EmployeesTable data={rows} />
    </div>
  );
}
```

- [ ] **Step 7: Crear la ficha del empleado y el modal de destajo**

`empleados/[id]/page.tsx`:

- Query `prisma.employee.findUnique` con `workshop`, `attendance` (últimas 10), `vacationRequests`, `payrollItems` (con `payroll`, últimas 6) y `pieceworkEntries` (últimas 10).
- `notFound()` si no existe.
- Query talleres para el modal de edición.
- `vacationBalance({ hireDate, year: new Date().getFullYear(), override, requests })`.
- Header con nombre, `employee.code`, cargo, estado, botón "Volver" y `EmployeeFormModal` con los datos del empleado. Para las fechas del formulario usar `toDateInputValue(employee.birthDate)`, `toDateInputValue(employee.hireDate)` y `toDateInputValue(employee.endDate)`; no usar `formatDate` porque el `DatePicker` espera `yyyy-MM-dd`.
- KPI cards: ingreso, vacaciones disponibles, último neto, destajo.
- Cards: datos/horario, asistencia reciente (`formatDate`, `formatTime`), destajo (tabla + `PieceworkFormModal`), vacaciones/liquidaciones.
- Enlazar cada liquidación a `/rrhh/liquidaciones/${item.payrollId}`.

`piecework-form-modal.tsx`:

- Props: `employeeId`, `pieceRate`, `trigger` y `stages` (etapas completadas con `id`, `label`, `quantity`, `description`).
- Incluir un `Select` opcional "Etapa de producción" con las etapas completadas. Al elegir una, precargar `quantity = stage.quantity` y `description = stage.description`.
- El resto del formulario: fecha, cantidad, tarifa unitaria, descripción; llama `savePieceworkEntry({ ...values, employeeId, productionOrderStageId })`.

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { savePieceworkEntry } from "@/actions/hr";
import { toDateInputValue } from "@/lib/format";

const schema = z.object({
  date: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitRate: z.coerce.number().int().min(0),
  description: z.string().optional().default(""),
});

type Values = z.infer<typeof schema>;

export function PieceworkFormModal({ employeeId, pieceRate, trigger }: { employeeId: string; pieceRate: number; trigger: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { date: toDateInputValue(new Date()), quantity: 0, unitRate: pieceRate, description: "" },
  });

  return (
    <FormDialog title="Registrar destajo" description="Unidades producidas y tarifa aplicada." trigger={trigger} className="sm:max-w-lg">
      {(close) => {
        function onSubmit(values: Values) {
          startTransition(async () => {
            const result = await savePieceworkEntry({ ...values, employeeId });
            if (!result.ok) {
              toast.error(result.error ?? "No pudimos registrar el destajo.");
              return;
            }
            toast.success("Destajo registrado.");
            router.refresh();
            close();
          });
        }
        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label>Fecha</Label><Controller control={control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Cantidad</Label><Input type="number" {...register("quantity", { valueAsNumber: true })} />{errors.quantity ? <p className="text-xs text-destructive">{errors.quantity.message}</p> : null}</div>
              <div className="space-y-1.5"><Label>Tarifa unitaria (Gs.)</Label><Input type="number" {...register("unitRate", { valueAsNumber: true })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Descripción</Label><Input {...register("description")} placeholder="Producción de octubre" /></div>
            <Button type="submit" className="w-full" disabled={pending}>Guardar destajo</Button>
          </form>
        );
      }}
    </FormDialog>
  );
}
```

- [ ] **Step 8: Verificar y commitear**

Run: `npm run lint`
Expected: sin errores.

```bash
git add src/lib/hr.ts src/lib/validators/employee.ts src/actions/hr.ts src/app/\(app\)/rrhh/empleados
git commit -m "feat(rrhh): agrega empleados, fichas y destajo"
```

---

## Task 4: Reloj y asistencia

**Files:**
- Create: `src/actions/attendance.ts`
- Create: `src/app/(app)/rrhh/reloj/page.tsx`
- Create: `src/app/(app)/rrhh/reloj/clock-kiosk.tsx`
- Create: `src/app/(app)/rrhh/asistencia/page.tsx`
- Create: `src/app/(app)/rrhh/asistencia/attendance-period-selector.tsx`
- Create: `src/app/(app)/rrhh/asistencia/attendance-summary-table.tsx`
- Create: `src/app/(app)/rrhh/asistencia/[employeeId]/page.tsx`
- Create: `src/app/(app)/rrhh/asistencia/[employeeId]/attendance-correction-dialog.tsx`

- [ ] **Step 1: Crear las acciones de asistencia**

`src/actions/attendance.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { calculateDV, onlyDigits } from "@/lib/fiscal";
import { computeAttendance, type ScheduleInput } from "@/lib/payroll";
import { toDateInputValue } from "@/lib/format";
import type { ActionResult } from "./customers";

function normalizeCi(value: string) {
  const clean = value.replace(/\s/g, "");
  if (clean.includes("-")) {
    const [base, dv] = clean.split("-");
    return `${onlyDigits(base ?? "")}-${onlyDigits(dv ?? "")}`;
  }
  const digits = onlyDigits(clean);
  return `${digits}-${calculateDV(digits)}`;
}

function scheduleOf(employee: {
  scheduledStart: string;
  scheduledEnd: string;
  lunchMinutes: number;
  workDays: number[];
  lateToleranceMinutes: number;
}): ScheduleInput {
  return {
    scheduledStart: employee.scheduledStart,
    scheduledEnd: employee.scheduledEnd,
    lunchMinutes: employee.lunchMinutes,
    workDays: employee.workDays,
    lateToleranceMinutes: employee.lateToleranceMinutes,
  };
}

export type ClockPunchResult = ActionResult & {
  employeeName?: string;
  mark?: "ENTRADA" | "SALIDA";
  time?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
};

export async function clockPunch(values: unknown): Promise<ClockPunchResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "Solo RRHH puede registrar marcas en el reloj." };
  }
  const parsed = z.object({ ci: z.string().min(1, "Ingresá la CI."), pin: z.string().min(1, "Ingresá el PIN.") }).safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const ci = normalizeCi(parsed.data.ci);
  const employee = await prisma.employee.findUnique({ where: { ci } });
  if (!employee || employee.status !== "ACTIVO") return { ok: false, error: "CI o PIN incorrecto." };
  const valid = await bcrypt.compare(parsed.data.pin, employee.pinHash);
  if (!valid) return { ok: false, error: "CI o PIN incorrecto." };

  const today = toDateInputValue(new Date());
  const day = new Date(`${today}T12:00:00-03:00`);
  const vacation = await prisma.vacationRequest.findFirst({
    where: { employeeId: employee.id, status: "APROBADA", startDate: { lte: day }, endDate: { gte: day } },
  });
  if (vacation) return { ok: false, error: "El empleado está de vacaciones hoy." };

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
  });
  if (existing?.checkIn && existing.checkOut) {
    return { ok: false, error: "Ya registraste entrada y salida hoy. Pedí una corrección a RRHH." };
  }

  const now = new Date();
  if (!existing) {
    const computation = computeAttendance({ date: day, checkIn: now, checkOut: null, schedule: scheduleOf(employee) });
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: day,
        checkIn: now,
        breakMinutes: computation.breakMinutes,
        lateMinutes: computation.lateMinutes,
        lateCount: computation.lateCount,
        earlyLeaveMinutes: computation.earlyLeaveMinutes,
        overtimeMinutes: computation.overtimeMinutes,
        workedMinutes: computation.workedMinutes,
        source: "RELOJ",
      },
    });
    revalidatePath("/rrhh/reloj");
    revalidatePath("/rrhh/asistencia");
    return { ok: true, employeeName: `${employee.firstName} ${employee.lastName}`, mark: "ENTRADA", time: now.toISOString(), lateMinutes: computation.lateMinutes };
  }

  const computation = computeAttendance({ date: day, checkIn: existing.checkIn, checkOut: now, schedule: scheduleOf(employee) });
  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
    },
  });
  revalidatePath("/rrhh/reloj");
  revalidatePath("/rrhh/asistencia");
  return { ok: true, employeeName: `${employee.firstName} ${employee.lastName}`, mark: "SALIDA", time: now.toISOString(), lateMinutes: computation.lateMinutes, overtimeMinutes: computation.overtimeMinutes };
}

const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function saveAttendance(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para corregir asistencias." };
  }
  const parsed = attendanceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) return { ok: false, error: "El empleado no existe." };

  const day = new Date(`${data.date}T12:00:00-03:00`);
  const checkIn = data.checkIn ? new Date(`${data.date}T${data.checkIn}:00-03:00`) : null;
  const checkOut = data.checkOut ? new Date(`${data.date}T${data.checkOut}:00-03:00`) : null;
  if (checkIn && checkOut && checkOut <= checkIn) {
    return { ok: false, error: "La salida debe ser posterior a la entrada." };
  }
  const computation = computeAttendance({ date: day, checkIn, checkOut, schedule: scheduleOf(employee) });
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
  });

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: day } },
    update: {
      checkIn,
      checkOut,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
      notes: data.notes || null,
      source: existing ? "CORRECCION" : "MANUAL",
      correctedById: session.user.username,
    },
    create: {
      employeeId: employee.id,
      date: day,
      checkIn,
      checkOut,
      breakMinutes: computation.breakMinutes,
      lateMinutes: computation.lateMinutes,
      lateCount: computation.lateCount,
      earlyLeaveMinutes: computation.earlyLeaveMinutes,
      overtimeMinutes: computation.overtimeMinutes,
      workedMinutes: computation.workedMinutes,
      notes: data.notes || null,
      source: "MANUAL",
      correctedById: session.user.username,
    },
  });
  revalidatePath("/rrhh/asistencia");
  revalidatePath(`/rrhh/asistencia/${employee.id}`);
  revalidatePath("/rrhh");
  return { ok: true };
}
```

- [ ] **Step 2: Crear la pantalla del reloj**

`reloj/page.tsx`:

```tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";
import { ClockKiosk } from "./clock-kiosk";

export const metadata: Metadata = { title: "Reloj de asistencia" };

export default async function ClockPage() {
  const todayKey = toDateInputValue(new Date());
  const day = new Date(`${todayKey}T12:00:00-03:00`);
  const marks = await prisma.attendance.findMany({
    where: { date: day },
    include: { employee: true },
    orderBy: { checkIn: "asc" },
  });
  return (
    <ClockKiosk
      todayKey={todayKey}
      marks={marks.map((mark) => ({
        id: mark.id,
        employee: `${mark.employee.firstName} ${mark.employee.lastName}`,
        code: mark.employee.code,
        checkIn: mark.checkIn?.toISOString() ?? null,
        checkOut: mark.checkOut?.toISOString() ?? null,
        lateMinutes: mark.lateMinutes,
        overtimeMinutes: mark.overtimeMinutes,
      }))}
    />
  );
}
```

`clock-kiosk.tsx`: componente cliente con reloj en vivo (`setInterval` cada segundo), campos CI y PIN, botón grande para marcar, feedback con toast y lista de marcas del día. Usar `clockPunch` y `formatTime`. Mostrar "Demo: PIN 1234 para todos los empleados." Deshabilitar el botón si el rol es GERENCIA (pasar `canPunch` desde la página usando `auth()` y `canWrite`).

- [ ] **Step 3: Crear la planilla de asistencia**

`asistencia/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CalendarDays, Clock, Timer, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { currentPeriod, periodRange } from "@/lib/hr";
import { countVacationDays, expectedWorkdays, isWorkday } from "@/lib/payroll";
import { AttendancePeriodSelector } from "./attendance-period-selector";
import { AttendanceSummaryTable, type AttendanceSummaryRow } from "./attendance-summary-table";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AttendancePage({ searchParams }: { searchParams: { mes?: string } }) {
  const fallback = currentPeriod();
  const [year, month] = (searchParams.mes ?? `${fallback.year}-${String(fallback.month).padStart(2, "0")}`).split("-").map(Number);
  const range = periodRange(year, month);
  const [employees, records, vacations] = await Promise.all([
    prisma.employee.findMany({ where: { status: { in: ["ACTIVO", "LICENCIA"] } }, orderBy: { code: "asc" } }),
    prisma.attendance.findMany({ where: { date: { gte: range.start, lte: range.end } } }),
    prisma.vacationRequest.findMany({ where: { status: "APROBADA", startDate: { lte: range.end }, endDate: { gte: range.start } } }),
  ]);

  const rows: AttendanceSummaryRow[] = employees.map((employee) => {
    const own = records.filter((record) => record.employeeId === employee.id);
    const workedDays = own.filter((record) => record.checkIn && record.checkOut && isWorkday(record.date, employee.workDays)).length;
    const lateMinutes = own.reduce((sum, record) => sum + record.lateMinutes, 0);
    const lateCount = own.reduce((sum, record) => sum + record.lateCount, 0);
    const overtimeMinutes = own.reduce((sum, record) => sum + record.overtimeMinutes, 0);
    const vacationDays = vacations
      .filter((request) => request.employeeId === employee.id)
      .reduce((sum, request) => {
        const start = request.startDate > range.start ? request.startDate : range.start;
        const end = request.endDate < range.end ? request.endDate : range.end;
        return sum + countVacationDays(start, end, employee.workDays);
      }, 0);
    const isCurrent = year === fallback.year && month === fallback.month;
    const expected = expectedWorkdays({
      periodStart: range.start,
      periodEnd: range.end,
      hireDate: employee.hireDate,
      endDate: employee.endDate,
      workDays: employee.workDays,
      asOf: isCurrent ? new Date() : undefined,
    });
    const incomplete = own.filter((record) => !record.checkIn || !record.checkOut).length;
    return {
      id: employee.id,
      code: employee.code,
      name: `${employee.firstName} ${employee.lastName}`,
      workedDays,
      expected,
      lateCount,
      lateMinutes,
      overtimeMinutes,
      absentDays: Math.max(0, expected - workedDays - vacationDays),
      vacationDays,
      incomplete,
      schedule: `${employee.scheduledStart}–${employee.scheduledEnd}`,
    };
  });

  const totals = rows.reduce((acc, row) => ({
    late: acc.late + row.lateMinutes,
    overtime: acc.overtime + row.overtimeMinutes,
    absent: acc.absent + row.absentDays,
    incomplete: acc.incomplete + row.incomplete,
  }), { late: 0, overtime: 0, absent: 0, incomplete: 0 });

  return (
    <div>
      <PageHeader title="Asistencia" description="Planilla mensual, tardanzas, horas extras y ausencias." actions={<AttendancePeriodSelector value={`${year}-${String(month).padStart(2, "0")}`} />} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Minutos tarde" value={String(totals.late)} hint="Suma del período" icon={Clock} tone={totals.late ? "warning" : "success"} />
        <KpiCard label="Horas extras" value={`${Math.round(totals.overtime / 6) / 10}`} hint="Horas del período" icon={Timer} />
        <KpiCard label="Ausencias" value={String(totals.absent)} hint="Días sin marca" icon={UserX} tone={totals.absent ? "danger" : "success"} />
        <KpiCard label="Marcas incompletas" value={String(totals.incomplete)} hint="Requieren corrección" icon={CalendarDays} tone={totals.incomplete ? "warning" : "default"} />
      </div>
      <AttendanceSummaryTable data={rows} />
    </div>
  );
}
```

`attendance-period-selector.tsx`: dos `Select` (mes y año) que hacen `router.push('/rrhh/asistencia?mes=YYYY-MM')`. Usar `MONTH_NAMES` y años `[year - 1, year, year + 1]`.

`attendance-summary-table.tsx`: `DataTable` con columnas Legajo, Empleado (link al detalle), Horario, Días (trabajados/esperados), Tardanzas (cantidad y minutos), Extras (horas), Ausencias, Vacaciones, Incompletas y acción "Ver detalle".

- [ ] **Step 4: Crear el detalle diario y la corrección**

`asistencia/[employeeId]/page.tsx`:

- Query empleado y registros del período (`searchParams.mes`, default actual).
- Header con nombre, legajo, período y selector.
- Botón "Agregar marca" con `AttendanceCorrectionDialog employeeId`.
- Lista/tabla de registros: fecha, entrada, salida, horas trabajadas, tardanza, extras, origen (`source`) y botón "Corregir".
- Si no hay registros, mostrar `EmptyState` o texto.

`attendance-correction-dialog.tsx`:

- `FormDialog` con `DatePicker` (solo si es nueva marca), `Input type="time"` para entrada y salida, `Textarea` para notas.
- Props: `employeeId`, `record?` (con `date`, `checkIn`, `checkOut`, `notes`), `trigger`.
- Convertir ISO a `HH:mm` para los defaults usando `formatTime` o un helper local.
- Al guardar: `saveAttendance({ employeeId, date, checkIn, checkOut, notes })`; toast, `router.refresh()`, `close()`.

- [ ] **Step 5: Verificar y commitear**

Run: `npm run lint` y `npm test -- src/lib/__tests__/payroll.test.ts`
Expected: sin errores y tests PASS.

```bash
git add src/actions/attendance.ts src/app/\(app\)/rrhh/reloj src/app/\(app\)/rrhh/asistencia
git commit -m "feat(rrhh): agrega reloj con PIN y planilla de asistencia"
```

---

## Task 5: Liquidaciones, pago y recibo PDF

**Files:**
- Create: `src/actions/payroll.ts`
- Create: `src/lib/pdf/payroll-receipt-pdf.tsx`
- Create: `src/app/api/pdf/recibo-sueldo/[id]/route.ts`
- Create: `src/app/(app)/ver/recibo-sueldo/[id]/page.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/page.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/new-payroll-dialog.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/payrolls-table.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/[id]/page.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/[id]/payroll-actions.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/[id]/payroll-items-table.tsx`
- Create: `src/app/(app)/rrhh/liquidaciones/[id]/payroll-item-dialog.tsx`

- [ ] **Step 1: Crear las acciones de liquidación**

`src/actions/payroll.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import {
  aguinaldoAmount,
  buildPayrollItem,
  countVacationDays,
  payrollTotals,
  type PayrollItemComputation,
} from "@/lib/payroll";
import { currentPeriod, periodRange } from "@/lib/hr";
import type { ActionResult } from "./customers";

type PeriodInput = { id: string; startDate: Date; endDate: Date; status: string };

async function collectItems(
  tx: Prisma.TransactionClient,
  period: PeriodInput,
  adjustments?: Map<string, { otherEarnings: number; otherDeductions: number; notes: string | null }>
) {
  const employees = await tx.employee.findMany({
    where: { status: { in: ["ACTIVO", "LICENCIA"] } },
    orderBy: { code: "asc" },
  });
  const [attendance, pieces, vacations] = await Promise.all([
    tx.attendance.findMany({ where: { date: { gte: period.startDate, lte: period.endDate } } }),
    tx.pieceworkEntry.findMany({ where: { date: { gte: period.startDate, lte: period.endDate } } }),
    tx.vacationRequest.findMany({
      where: { status: "APROBADA", startDate: { lte: period.endDate }, endDate: { gte: period.startDate } },
    }),
  ]);
  const asOf = period.status === "BORRADOR" ? new Date() : undefined;

  return employees.map((employee) => {
    const vacationDays = vacations
      .filter((request) => request.employeeId === employee.id)
      .reduce((sum, request) => {
        const start = request.startDate > period.startDate ? request.startDate : period.startDate;
        const end = request.endDate < period.endDate ? request.endDate : period.endDate;
        return sum + countVacationDays(start, end, employee.workDays);
      }, 0);
    const adjustment = adjustments?.get(employee.id);
    const item = buildPayrollItem({
      employee,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      asOf,
      attendance: attendance.filter((record) => record.employeeId === employee.id),
      pieces: pieces.filter((piece) => piece.employeeId === employee.id),
      vacationDays,
      otherEarnings: adjustment?.otherEarnings ?? 0,
      otherDeductions: adjustment?.otherDeductions ?? 0,
      notes: adjustment?.notes ?? null,
    });
    return { employeeId: employee.id, item };
  });
}

function itemData(payrollId: string, employeeId: string, item: PayrollItemComputation) {
  return { payrollId, employeeId, ...item, concepts: item.concepts as Prisma.InputJsonValue };
}

async function syncTotals(tx: Prisma.TransactionClient, payrollId: string) {
  const items = await tx.payrollItem.findMany({ where: { payrollId } });
  const totals = items.reduce(
    (acc, item) => ({
      grossTotal: acc.grossTotal + item.grossAmount,
      ipsEmployeeTotal: acc.ipsEmployeeTotal + item.ipsEmployee,
      ipsEmployerTotal: acc.ipsEmployerTotal + item.ipsEmployer,
      deductionsTotal:
        acc.deductionsTotal + item.lateDeduction + item.absenceDeduction + item.ipsEmployee + item.otherDeductions,
      netTotal: acc.netTotal + item.netAmount,
      extraTotal: acc.extraTotal + item.extraAmount,
      pieceTotal: acc.pieceTotal + item.pieceAmount,
      lateTotal: acc.lateTotal + item.lateDeduction,
      absenceTotal: acc.absenceTotal + item.absenceDeduction,
      vacationTotal: acc.vacationTotal + item.vacationAmount,
    }),
    { grossTotal: 0, ipsEmployeeTotal: 0, ipsEmployerTotal: 0, deductionsTotal: 0, netTotal: 0, extraTotal: 0, pieceTotal: 0, lateTotal: 0, absenceTotal: 0, vacationTotal: 0 }
  );
  await tx.payrollPeriod.update({ where: { id: payrollId }, data: totals });
  return totals;
}

export async function createPayroll(values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para crear liquidaciones." };
  }
  const parsed = z.object({ year: z.coerce.number().int().min(2020).max(2100), month: z.coerce.number().int().min(1).max(12) }).safeParse(values);
  if (!parsed.success) return { ok: false, error: "Período inválido." };
  const { year, month } = parsed.data;
  const existing = await prisma.payrollPeriod.findUnique({ where: { type_year_month: { type: "MENSUAL", year, month } } });
  if (existing) return { ok: false, error: `Ya existe la liquidación ${existing.number}.` };
  const range = periodRange(year, month);

  try {
    const payroll = await prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          number: range.number,
          type: "MENSUAL",
          year,
          month,
          startDate: range.start,
          endDate: range.end,
          status: "BORRADOR",
          userId: session.user.username,
        },
      });
      const rows = await collectItems(tx, period);
      if (rows.length === 0) throw new Error("Sin empleados activos.");
      await tx.payrollItem.createMany({ data: rows.map(({ employeeId, item }) => itemData(period.id, employeeId, item)) });
      await syncTotals(tx, period.id);
      return period;
    });
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/rrhh");
    return { ok: true, id: payroll.id };
  } catch {
    return { ok: false, error: "No pudimos crear la liquidación." };
  }
}

export async function recalculatePayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para recalcular liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId }, include: { items: true } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "BORRADOR") return { ok: false, error: "Solo se pueden recalcular borradores." };
  const adjustments = new Map(period.items.map((item) => [item.employeeId, { otherEarnings: item.otherEarnings, otherDeductions: item.otherDeductions, notes: item.notes }]));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payrollItem.deleteMany({ where: { payrollId } });
      const rows = await collectItems(tx, period, adjustments);
      await tx.payrollItem.createMany({ data: rows.map(({ employeeId, item }) => itemData(period.id, employeeId, item)) });
      await syncTotals(tx, period.id);
    });
    revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
    return { ok: true, id: payrollId };
  } catch {
    return { ok: false, error: "No pudimos recalcular la liquidación." };
  }
}

export async function updatePayrollItem(itemId: string, values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para ajustar la liquidación." };
  }
  const parsed = z.object({
    otherEarnings: z.coerce.number().int().min(0).default(0),
    otherDeductions: z.coerce.number().int().min(0).default(0),
    notes: z.string().optional().default(""),
  }).safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const item = await prisma.payrollItem.findUnique({ where: { id: itemId }, include: { payroll: true } });
  if (!item) return { ok: false, error: "El ítem no existe." };
  if (item.payroll.status !== "BORRADOR") return { ok: false, error: "La liquidación ya está cerrada." };
  const { otherEarnings, otherDeductions, notes } = parsed.data;
  const grossAmount = item.baseAmount + item.vacationAmount + item.extraAmount + otherEarnings;
  const ipsEmployee = Math.round(grossAmount * 0.09);
  const ipsEmployer = Math.round(grossAmount * 0.165);
  const netAmount = grossAmount - item.lateDeduction - item.absenceDeduction - ipsEmployee - otherDeductions;

  await prisma.$transaction(async (tx) => {
    await tx.payrollItem.update({
      where: { id: itemId },
      data: { otherEarnings, otherDeductions, grossAmount, ipsBase: grossAmount, ipsEmployee, ipsEmployer, netAmount, notes: notes || null },
    });
    await syncTotals(tx, item.payrollId);
  });
  revalidatePath(`/rrhh/liquidaciones/${item.payrollId}`);
  return { ok: true, id: itemId };
}

export async function closePayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cerrar liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId }, include: { items: true } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "BORRADOR") return { ok: false, error: "Solo se cierran borradores." };
  if (period.items.some((item) => item.netAmount < 0)) {
    return { ok: false, error: "Hay ítems con neto negativo. Ajustá los descuentos antes de cerrar." };
  }
  await prisma.$transaction(async (tx) => {
    await syncTotals(tx, payrollId);
    await tx.payrollPeriod.update({ where: { id: payrollId }, data: { status: "CERRADA", closedAt: new Date() } });
  });
  revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
  revalidatePath("/rrhh/liquidaciones");
  revalidatePath("/rrhh");
  return { ok: true, id: payrollId };
}

export async function payPayroll(payrollId: string, values: unknown): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para pagar liquidaciones." };
  }
  const parsed = z.object({
    paymentMethodId: z.string().min(1),
    paidFromCash: z.boolean().default(false),
  }).safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos de pago inválidos." };
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status !== "CERRADA") return { ok: false, error: "Solo se pagan liquidaciones cerradas." };
  if (period.netTotal <= 0) return { ok: false, error: "La liquidación no tiene monto a pagar." };

  const category = await prisma.expenseCategory.findFirst({ where: { name: "Sueldos" } });
  if (!category) return { ok: false, error: "Falta la categoría de gasto Sueldos." };

  let cashSessionId: string | null = null;
  if (parsed.data.paidFromCash) {
    const cashSession = await prisma.cashSession.findFirst({ where: { status: "ABIERTA" }, orderBy: { openedAt: "desc" } });
    if (!cashSession) return { ok: false, error: "No hay una caja abierta para pagar desde efectivo." };
    cashSessionId = cashSession.id;
  }

  const isAguinaldo = period.type === "AGUINALDO";
  const description = isAguinaldo ? `Aguinaldo ${period.year}` : `Liquidación de sueldos ${String(period.month).padStart(2, "0")}/${period.year}`;

  try {
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          date: new Date(),
          categoryId: category.id,
          voucherNumber: period.number,
          description,
          amount: period.netTotal,
          taxRate: 0,
          paymentMethodId: parsed.data.paymentMethodId,
          cashSessionId,
          paidFromCash: parsed.data.paidFromCash,
          userId: session.user.username,
        },
      });
      if (cashSessionId) {
        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: "EGRESO_GASTO",
            paymentMethodId: parsed.data.paymentMethodId,
            amount: period.netTotal,
            reference: period.number,
            description,
            date: new Date(),
          },
        });
      }
      await tx.payrollPeriod.update({
        where: { id: payrollId },
        data: {
          status: "PAGADA",
          paidAt: new Date(),
          paymentMethodId: parsed.data.paymentMethodId,
          paidFromCash: parsed.data.paidFromCash,
          expenseId: expense.id,
        },
      });
    });
    revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/gastos");
    revalidatePath("/caja");
    return { ok: true, id: payrollId };
  } catch {
    return { ok: false, error: "No pudimos registrar el pago." };
  }
}

export async function annulPayroll(payrollId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para anular liquidaciones." };
  }
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollId } });
  if (!period) return { ok: false, error: "La liquidación no existe." };
  if (period.status === "PAGADA") return { ok: false, error: "No se puede anular una liquidación pagada." };
  await prisma.payrollPeriod.update({ where: { id: payrollId }, data: { status: "ANULADA" } });
  revalidatePath(`/rrhh/liquidaciones/${payrollId}`);
  revalidatePath("/rrhh/liquidaciones");
  return { ok: true, id: payrollId };
}

export async function generateAguinaldo(year: number): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para generar aguinaldos." };
  }
  const existing = await prisma.payrollPeriod.findUnique({ where: { type_year_month: { type: "AGUINALDO", year, month: 12 } } });
  if (existing) return { ok: false, error: `Ya existe el aguinaldo ${existing.number}.` };
  const periods = await prisma.payrollPeriod.findMany({
    where: { type: "MENSUAL", year, status: { in: ["CERRADA", "PAGADA"] } },
    include: { items: true },
  });
  const byEmployee = new Map<string, number>();
  for (const period of periods) {
    for (const item of period.items) {
      byEmployee.set(item.employeeId, (byEmployee.get(item.employeeId) ?? 0) + item.grossAmount);
    }
  }
  if (byEmployee.size === 0) return { ok: false, error: "No hay liquidaciones cerradas en el año." };
  const current = currentPeriod();
  const range = periodRange(year, 12);

  try {
    const payroll = await prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          number: `AGU-${year}`,
          type: "AGUINALDO",
          year,
          month: 12,
          startDate: new Date(`${year}-01-01T00:00:00-03:00`),
          endDate: range.end,
          status: "BORRADOR",
          notes: year >= current.year ? "Provisorio: el año aún no terminó." : null,
          userId: session.user.username,
        },
      });
      for (const [employeeId, total] of byEmployee) {
        const amount = aguinaldoAmount(total);
        await tx.payrollItem.create({
          data: {
            payrollId: period.id,
            employeeId,
            payType: "MENSUAL",
            baseAmount: total,
            grossAmount: amount,
            ipsBase: 0,
            ipsEmployee: 0,
            ipsEmployer: 0,
            netAmount: amount,
            concepts: { aguinaldo: true, totalGanado: total },
          },
        });
      }
      await syncTotals(tx, period.id);
      return period;
    });
    revalidatePath("/rrhh/liquidaciones");
    revalidatePath("/rrhh/aguinaldo");
    return { ok: true, id: payroll.id };
  } catch {
    return { ok: false, error: "No pudimos generar el aguinaldo." };
  }
}
```

- [ ] **Step 2: Crear el recibo PDF**

`src/lib/pdf/payroll-receipt-pdf.tsx`: seguir `src/lib/pdf/receipt-pdf.tsx`.

- A4, Helvetica, paleta `#0b2f31`, marca de agua DEMO.
- Título "RECIBO DE SUELDO" o "RECIBO DE AGUINALDO" según `data.period.type`.
- Header: empresa (razón social, RUC, dirección), número `REC-${period.number}-${employee.code}`, fecha.
- Datos del empleado: nombre, legajo, CI, cargo, período.
- Tabla de conceptos: fila por concepto con haber/descuento. Incluir solo montos distintos de cero:
  - Sueldo / Jornal / Destajo / Mixto (baseAmount)
  - Vacaciones (vacationAmount)
  - Horas extras (extraAmount)
  - Otros ingresos (otherEarnings)
  - Tardanzas (lateDeduction)
  - Ausencias (absenceDeduction)
  - IPS 9% (ipsEmployee)
  - Otros descuentos (otherDeductions)
- Totales: total haberes, total descuentos, neto.
- Neto en letras con `numeroALetras`.
- Leyenda DEMO, firmas "Empleado" y "Responsable de RRHH".
- Tipo `PayrollReceiptData` exportado.

- [ ] **Step 3: Crear la API y el visor**

`src/app/api/pdf/recibo-sueldo/[id]/route.ts`: copiar el patrón de `src/app/api/pdf/recibo/[id]/route.ts`. Query `payrollItem` con `employee`, `payroll`; query `company`; verificar `canViewPdf(session.user.role, "recibo-sueldo")`; renderizar `PayrollReceiptPdf` y devolver `application/pdf` con `Content-Disposition: attachment; filename="REC-...pdf"`.

`src/app/(app)/ver/recibo-sueldo/[id]/page.tsx`: copiar el patrón de `src/app/(app)/ver/recibo/[id]/page.tsx`. Verificar `canViewPdf`; query item con employee/payroll; mostrar `PdfViewer` con `/api/pdf/recibo-sueldo/${id}`, botón Volver a `/rrhh/liquidaciones/${payrollId}` y Descargar.

- [ ] **Step 4: Crear la lista de liquidaciones**

`liquidaciones/page.tsx`:

- Query `prisma.payrollPeriod.findMany({ include: { _count: { select: { items: true } } }, orderBy: [{ year: "desc" }, { month: "desc" }] })`.
- KPIs: neto del último período, IPS del último período, horas extras del último período, cantidad de períodos.
- Header con `NewPayrollDialog`.
- `PayrollsTable` con columnas: Número (link a `/rrhh/liquidaciones/[id]`), Tipo, Período, Estado, Empleados, Haberes, IPS, Neto, acción "Ver".
- `NewPayrollDialog`: `FormDialog` con Select de mes (`MONTH_NAMES`) y año (actual y anterior), llama `createPayroll`, al éxito `router.push(`/rrhh/liquidaciones/${result.id}`)`.

- [ ] **Step 5: Crear el detalle de liquidación**

`liquidaciones/[id]/page.tsx`:

- Query período con `items: { include: { employee: true }, orderBy: { employee: { code: "asc" } } }`, `paymentMethod`.
- Query métodos de pago activos y sesión de caja abierta.
- Header: número, tipo, período, `StatusBadge`, botón Volver, `PayrollActions`.
- Banner DEMO.
- KPI cards: Haberes, IPS empleado, Descuentos, Neto.
- `PayrollItemsTable` con legajo, empleado, tipo, días/unidades, extras, tardanzas, haberes, IPS, neto, recibo y ajuste (solo BORRADOR). El recibo debe ser un `<Link href={`/ver/recibo-sueldo/${item.id}`}>Recibo</Link>` para que el E2E lo encuentre.
- `PayrollActions`: botones Recalcular (BORRADOR), Cerrar (BORRADOR), Pagar (CERRADA), Anular (BORRADOR/CERRADA). Usar `AlertDialog` para cerrar/anular y un `FormDialog` para pagar con Select de medio de pago y Switch "Pagado desde caja". Al pagar, mostrar aviso si no hay caja abierta. Toasts y `router.refresh()`. Pasar `canWrite` desde la página y ocultar las acciones de escritura para GERENCIA.
- `PayrollItemDialog`: `FormDialog` con inputs `otherEarnings`, `otherDeductions`, `notes`, llama `updatePayrollItem`. Mostrar solo si `canWrite` y el período está en BORRADOR.

- [ ] **Step 6: Verificar y commitear**

Run: `npm run lint` y `npm test -- src/lib/__tests__/payroll.test.ts`
Expected: sin errores y PASS.

```bash
git add src/actions/payroll.ts src/lib/pdf/payroll-receipt-pdf.tsx src/app/api/pdf/recibo-sueldo src/app/\(app\)/ver/recibo-sueldo src/app/\(app\)/rrhh/liquidaciones
git commit -m "feat(rrhh): agrega liquidaciones, pago y recibos PDF"
```

---

## Task 6: Vacaciones y aguinaldo

**Files:**
- Create: `src/actions/vacations.ts`
- Create: `src/app/(app)/rrhh/vacaciones/page.tsx`
- Create: `src/app/(app)/rrhh/vacaciones/vacation-form-modal.tsx`
- Create: `src/app/(app)/rrhh/vacaciones/vacation-requests-table.tsx`
- Create: `src/app/(app)/rrhh/vacaciones/vacation-balances-table.tsx`
- Create: `src/app/(app)/rrhh/aguinaldo/page.tsx`
- Create: `src/app/(app)/rrhh/aguinaldo/aguinaldo-table.tsx`
- Create: `src/app/(app)/rrhh/aguinaldo/generate-aguinaldo-button.tsx`

- [ ] **Step 1: Crear las acciones de vacaciones**

`src/actions/vacations.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { countVacationDays, vacationEntitlement } from "@/lib/payroll";
import type { ActionResult } from "./customers";

const requestSchema = z.object({
  employeeId: z.string().min(1, "Seleccioná un empleado."),
  startDate: z.string().min(1, "Seleccioná la fecha de inicio."),
  endDate: z.string().min(1, "Seleccioná la fecha de fin."),
  reason: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

async function availableDays(employeeId: string, year: number, ignoreId?: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;
  const yearStart = new Date(`${year}-01-01T00:00:00-03:00`);
  const yearEnd = new Date(`${year}-12-31T23:59:59-03:00`);
  const requests = await prisma.vacationRequest.findMany({
    where: {
      employeeId,
      status: { in: ["APROBADA", "PENDIENTE"] },
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
  });
  const entitlement = vacationEntitlement(employee.hireDate, year, employee.vacationDaysOverride);
  const taken = requests.filter((request) => request.status === "APROBADA").reduce((sum, request) => sum + request.days, 0);
  return { employee, entitlement, taken, available: Math.max(0, entitlement - taken) };
}

export async function createVacationRequest(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para registrar vacaciones." };
  }
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const start = new Date(`${data.startDate}T12:00:00-03:00`);
  const end = new Date(`${data.endDate}T12:00:00-03:00`);
  if (end < start) return { ok: false, error: "La fecha de fin debe ser posterior al inicio." };
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) return { ok: false, error: "El empleado no existe." };
  const days = countVacationDays(start, end, employee.workDays);
  if (days <= 0) return { ok: false, error: "El rango no contiene días laborales." };
  const balance = await availableDays(employee.id, start.getFullYear());
  if (!balance) return { ok: false, error: "El empleado no existe." };
  if (days > balance.available) return { ok: false, error: `Solo quedan ${balance.available} días disponibles.` };

  const overlap = await prisma.vacationRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ["PENDIENTE", "APROBADA"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) return { ok: false, error: "Ya hay una solicitud en ese rango de fechas." };

  await prisma.vacationRequest.create({
    data: {
      employeeId: employee.id,
      startDate: start,
      endDate: end,
      days,
      reason: data.reason || null,
      notes: data.notes || null,
      status: "PENDIENTE",
    },
  });
  revalidatePath("/rrhh/vacaciones");
  revalidatePath("/rrhh");
  revalidatePath(`/rrhh/empleados/${employee.id}`);
  return { ok: true };
}

export async function decideVacationRequest(id: string, decision: "APROBADA" | "RECHAZADA"): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para decidir vacaciones." };
  }
  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "La solicitud no existe." };
  if (request.status !== "PENDIENTE") return { ok: false, error: "La solicitud ya fue decidida." };

  if (decision === "APROBADA") {
    const balance = await availableDays(request.employeeId, request.startDate.getFullYear(), request.id);
    if (!balance) return { ok: false, error: "El empleado no existe." };
    if (request.days > balance.available) return { ok: false, error: `Solo quedan ${balance.available} días disponibles.` };
  }

  await prisma.vacationRequest.update({
    where: { id },
    data: { status: decision, decidedAt: new Date(), decidedBy: session.user.username },
  });
  revalidatePath("/rrhh/vacaciones");
  revalidatePath(`/rrhh/empleados/${request.employeeId}`);
  revalidatePath("/rrhh");
  return { ok: true, id };
}

export async function cancelVacationRequest(id: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "RRHH");
  } catch {
    return { ok: false, error: "No tenés permiso para cancelar vacaciones." };
  }
  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return { ok: false, error: "La solicitud no existe." };
  if (request.status !== "PENDIENTE") return { ok: false, error: "Solo se cancelan solicitudes pendientes." };
  await prisma.vacationRequest.update({ where: { id }, data: { status: "CANCELADA", decidedAt: new Date() } });
  revalidatePath("/rrhh/vacaciones");
  return { ok: true, id };
}
```

- [ ] **Step 2: Crear la página de vacaciones**

`vacaciones/page.tsx`:

- Query empleados activos y solicitudes del año actual (o `searchParams.anio`).
- Para cada empleado, calcular `vacationBalance` con `src/lib/hr.ts`.
- Header con `VacationFormModal` y selector de año.
- KPI cards: días disponibles totales, solicitudes pendientes, aprobadas del año, empleados con saldo bajo.
- Dos secciones: "Solicitudes" (`VacationRequestsTable`) y "Saldos" (`VacationBalancesTable`).

`vacation-form-modal.tsx`: `FormDialog` con Select de empleado, dos `DatePicker` (inicio/fin), `Input` motivo, `Textarea` notas. Llama `createVacationRequest`; toast, refresh, close.

`vacation-requests-table.tsx`: `DataTable` con Legajo, Empleado, Desde, Hasta, Días, Estado, Decisión. Acciones con `useTransition`: Aprobar, Rechazar (confirmación con `AlertDialog`), Cancelar (solo pendiente). Toasts. Pasar `canWrite` y ocultar acciones para GERENCIA.

`vacation-balances-table.tsx`: `DataTable` con Legajo, Empleado, Ingreso, Antigüedad, Derecho, Tomados, Pendientes, Disponibles. Barra de progreso opcional con `Progress`.

- [ ] **Step 3: Crear la página de aguinaldo**

`aguinaldo/page.tsx`:

- Año actual (o `searchParams.anio`).
- Query períodos `MENSUAL` del año con `items` y `employee` (estados `CERRADA`, `PAGADA` y `BORRADOR`).
- Agrupar por empleado: total ganado (solo CERRADA/PAGADA), proyección (incluye BORRADOR).
- `aguinaldoAmount` para cada total.
- Query si ya existe `AGUINALDO` del año.
- Header con selector de año y `GenerateAguinaldoButton` (deshabilitado si ya existe, con link al período existente).
- KPI cards: total aguinaldo definitivo, proyección, empleados alcanzados.
- `AguinaldoTable` con Legajo, Empleado, Meses computados, Total ganado, Aguinaldo 1/12, Estado (definitivo/proyección).
- Nota DEMO sobre cálculo simplificado y año provisorio.

`generate-aguinaldo-button.tsx`: cliente, `useTransition`, `generateAguinaldo(year)`, toast, `router.push(`/rrhh/liquidaciones/${result.id}`)`.

- [ ] **Step 4: Verificar y commitear**

Run: `npm run lint`
Expected: sin errores.

```bash
git add src/actions/vacations.ts src/app/\(app\)/rrhh/vacaciones src/app/\(app\)/rrhh/aguinaldo
git commit -m "feat(rrhh): agrega vacaciones y aguinaldo"
```

---

## Task 7: Panel RRHH y tarjeta en el dashboard

**Files:**
- Create: `src/app/(app)/rrhh/page.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Crear el panel RRHH**

`src/app/(app)/rrhh/page.tsx`:

- `<PageHeader title="Recursos Humanos" description="Empleados, asistencia, liquidaciones y vacaciones." ... />`.
- Query en paralelo:
  - Empleados activos / total.
  - Último período `MENSUAL` (CERRADA/PAGADA) y el período actual (BORRADOR).
  - Asistencias del mes actual: suma de `lateMinutes`, `overtimeMinutes`, registros incompletos.
  - Solicitudes de vacaciones pendientes.
  - Items de períodos `MENSUAL` del año para proyectar aguinaldo.
- KPI cards: "Empleados activos", "Planilla del mes" (neto del período actual o último), "Horas extras del mes", "Tardanzas del mes", "Vacaciones pendientes", "Aguinaldo proyectado".
- Gráfico `SimpleBarChart` con los últimos 6 períodos (neto por mes).
- Quick links a Empleados, Reloj, Asistencia, Liquidaciones, Vacaciones, Aguinaldo.
- Si no hay datos, `EmptyState` con acción "Crear empleado" o "Crear liquidación".

- [ ] **Step 2: Agregar la tarjeta al dashboard principal**

En `src/app/(app)/page.tsx`:

- Importar `auth` ya está; obtener `session` ya existe.
- Query `prisma.payrollPeriod.findFirst({ where: { type: "MENSUAL", status: { in: ["CERRADA", "PAGADA", "BORRADOR"] } }, orderBy: [{ year: "desc" }, { month: "desc" }] })`.
- Mostrar una tarjeta compacta debajo del grid de KPIs solo si el rol es ADMIN, GERENCIA o RRHH:

```tsx
{session && ["ADMIN", "GERENCIA", "RRHH"].includes(session.user.role) ? (
  <Link
    href="/rrhh/liquidaciones"
    className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-white px-4 py-3 transition-colors hover:border-primary/30"
  >
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Wallet className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Planilla del mes</p>
        <p className="text-lg font-semibold tabular">{payroll ? formatGs(payroll.netTotal) : "—"}</p>
      </div>
    </div>
    <div className="text-right text-[11px] text-muted-foreground">
      <p>{payroll ? `${payroll.number} · ${payroll.status}` : "Sin liquidaciones"}</p>
      <span className="text-primary">Ver liquidaciones →</span>
    </div>
  </Link>
) : null}
```

- [ ] **Step 3: Verificar y commitear**

Run: `npm run lint` y `npm run build` (el build puede requerir base de datos; si falla por DB, anotar y continuar).
Expected: lint sin errores.

```bash
git add src/app/\(app\)/rrhh/page.tsx src/app/\(app\)/page.tsx
git commit -m "feat(rrhh): agrega panel de RRHH y tarjeta de planilla"
```

---

## Task 8: Seed demo de RRHH

**Files:**
- Create: `prisma/seed/hr.ts`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Crear el seed de RRHH**

`prisma/seed/hr.ts`:

```ts
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateDV } from "../../src/lib/fiscal";
import {
  buildPayrollItem,
  computeAttendance,
  countVacationDays,
  isWorkday,
  payrollTotals,
} from "../../src/lib/payroll";
import { randInt, chance } from "./helpers";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const prisma = new PrismaClient();

type EmployeeSeed = {
  code: string;
  firstName: string;
  lastName: string;
  ciBase: string;
  position: string;
  department: string;
  workshopId: string | null;
  hireDate: string;
  payType: "MENSUAL" | "JORNAL" | "DESTAJO" | "MIXTO";
  monthlySalary: number | null;
  dailyRate: number | null;
  pieceRate: number | null;
  scheduledStart: string;
  scheduledEnd: string;
};

const EMPLOYEES: EmployeeSeed[] = [
  { code: "EMP-0001", firstName: "Ramona", lastName: "Cáceres", ciBase: "3456789", position: "Costurera", department: "Producción", workshopId: "taller_2", hireDate: "2018-03-12", payType: "JORNAL", monthlySalary: null, dailyRate: 150_000, pieceRate: null, scheduledStart: "07:00", scheduledEnd: "16:00" },
  { code: "EMP-0002", firstName: "Derlis", lastName: "Aquino", ciBase: "4123456", position: "Cortador", department: "Producción", workshopId: "taller_1", hireDate: "2020-06-01", payType: "DESTAJO", monthlySalary: null, dailyRate: 150_000, pieceRate: 12_000, scheduledStart: "07:00", scheduledEnd: "16:00" },
  { code: "EMP-0003", firstName: "Gloria", lastName: "Medina", ciBase: "5234567", position: "Costurera", department: "Producción", workshopId: "taller_2", hireDate: "2022-02-15", payType: "DESTAJO", monthlySalary: null, dailyRate: 140_000, pieceRate: 10_000, scheduledStart: "07:00", scheduledEnd: "16:00" },
  { code: "EMP-0004", firstName: "Osvaldo", lastName: "Rojas", ciBase: "2345678", position: "Encargado de taller", department: "Producción", workshopId: "taller_2", hireDate: "2016-09-05", payType: "MENSUAL", monthlySalary: 5_500_000, dailyRate: null, pieceRate: null, scheduledStart: "07:30", scheduledEnd: "17:00" },
  { code: "EMP-0005", firstName: "Liz", lastName: "Sánchez", ciBase: "6345678", position: "Vendedora", department: "Ventas", workshopId: null, hireDate: "2021-04-19", payType: "MENSUAL", monthlySalary: 4_200_000, dailyRate: null, pieceRate: null, scheduledStart: "08:00", scheduledEnd: "18:00" },
  { code: "EMP-0006", firstName: "Jorge", lastName: "Fleitas", ciBase: "7456789", position: "Cajero", department: "Administración", workshopId: null, hireDate: "2023-07-10", payType: "MENSUAL", monthlySalary: 4_000_000, dailyRate: null, pieceRate: null, scheduledStart: "08:00", scheduledEnd: "18:00" },
  { code: "EMP-0007", firstName: "Nidia", lastName: "Benítez", ciBase: "8567890", position: "Auxiliar de depósito", department: "Depósito", workshopId: null, hireDate: "2019-11-04", payType: "JORNAL", monthlySalary: null, dailyRate: 130_000, pieceRate: null, scheduledStart: "07:30", scheduledEnd: "17:00" },
  { code: "EMP-0008", firstName: "Rodrigo", lastName: "Villalba", ciBase: "9678901", position: "Ayudante", department: "Producción", workshopId: "taller_1", hireDate: "2024-03-18", payType: "JORNAL", monthlySalary: null, dailyRate: 120_000, pieceRate: null, scheduledStart: "07:00", scheduledEnd: "16:00" },
  { code: "EMP-0009", firstName: "Celia", lastName: "Giménez", ciBase: "1789012", position: "Administrativa", department: "Administración", workshopId: null, hireDate: "2017-01-23", payType: "MENSUAL", monthlySalary: 4_800_000, dailyRate: null, pieceRate: null, scheduledStart: "08:00", scheduledEnd: "18:00" },
  { code: "EMP-0010", firstName: "Marcelo", lastName: "Ayala", ciBase: "2890123", position: "Costurero", department: "Producción", workshopId: "taller_2", hireDate: "2025-05-12", payType: "MIXTO", monthlySalary: 3_200_000, dailyRate: null, pieceRate: 6_000, scheduledStart: "07:00", scheduledEnd: "16:00" },
];

const VACATIONS = [
  { id: "vac_1", employeeCode: "EMP-0002", startDate: "2026-01-12", endDate: "2026-01-16", status: "APROBADA" as const, reason: "Vacaciones de verano" },
  { id: "vac_2", employeeCode: "EMP-0005", startDate: "2026-07-06", endDate: "2026-07-10", status: "APROBADA" as const, reason: "Vacaciones familiares" },
  { id: "vac_3", employeeCode: "EMP-0001", startDate: "2026-11-02", endDate: "2026-11-06", status: "PENDIENTE" as const, reason: "Viaje familiar" },
  { id: "vac_4", employeeCode: "EMP-0008", startDate: "2026-12-14", endDate: "2026-12-18", status: "PENDIENTE" as const, reason: "Vacaciones de fin de año" },
  { id: "vac_5", employeeCode: "EMP-0007", startDate: "2026-08-03", endDate: "2026-08-07", status: "RECHAZADA" as const, reason: "Cobertura de depósito" },
];

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateAt(year: number, month: number, day: number, hour = 12, minute = 0) {
  return new Date(`${dayKey(year, month, day)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`);
}

function monthRange(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: dateAt(year, month, 1, 0, 0), end: dateAt(year, month, lastDay, 23, 59) };
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

function buildTimestamp(base: Date, totalMinutes: number) {
  return new Date(base.getTime() + totalMinutes * 60_000);
}

export async function seedHR() {
  const pinHash = await bcrypt.hash("1234", 10);
  const employees = EMPLOYEES.map((employee) => {
    const { ciBase, ...rest } = employee;
    return {
      ...rest,
      ci: `${ciBase}-${calculateDV(ciBase)}`,
      hireDate: new Date(`${rest.hireDate}T12:00:00-03:00`),
      id: `emp_${employee.code.slice(4)}`,
      pinHash,
      workDays: [1, 2, 3, 4, 5, 6],
      lunchMinutes: 60,
      lateToleranceMinutes: 10,
      status: "ACTIVO" as const,
    };
  });

  await prisma.employee.createMany({ data: employees });
  const employeeByCode = new Map(employees.map((employee) => [employee.code, employee]));

  const vacationRows = VACATIONS.map((vacation) => {
    const employee = employeeByCode.get(vacation.employeeCode)!;
    const start = new Date(`${vacation.startDate}T12:00:00-03:00`);
    const end = new Date(`${vacation.endDate}T12:00:00-03:00`);
    return {
      id: vacation.id,
      employeeId: employee.id,
      startDate: start,
      endDate: end,
      days: countVacationDays(start, end, employee.workDays),
      status: vacation.status,
      reason: vacation.reason,
      requestedAt: new Date(`${vacation.startDate}T09:00:00-03:00`),
      decidedAt: vacation.status === "PENDIENTE" ? null : new Date(`${vacation.startDate}T10:00:00-03:00`),
      decidedBy: vacation.status === "PENDIENTE" ? null : "rrhh",
    };
  });
  await prisma.vacationRequest.createMany({ data: vacationRows });

  const approvedVacations = vacationRows.filter((vacation) => vacation.status === "APROBADA");
  const vacationDaysFor = (employeeId: string, start: Date, end: Date, workDays: number[]) =>
    approvedVacations
      .filter((vacation) => vacation.employeeId === employeeId && vacation.startDate <= end && vacation.endDate >= start)
      .reduce((sum, vacation) => {
        const from = vacation.startDate > start ? vacation.startDate : start;
        const to = vacation.endDate < end ? vacation.endDate : end;
        return sum + countVacationDays(from, to, workDays);
      }, 0);

  const attendance: Prisma.AttendanceCreateManyInput[] = [];
  let attendanceId = 0;
  const today = dateAt(2026, 10, 23, 23, 59);

  for (const employee of employees) {
    for (let month = 1; month <= 10; month++) {
      const lastDay = new Date(Date.UTC(2026, month, 0)).getUTCDate();
      for (let day = 1; day <= lastDay; day++) {
        const date = dateAt(2026, month, day);
        if (date > today) continue;
        if (!isWorkday(date, employee.workDays)) continue;
        if (approvedVacations.some((vacation) => vacation.employeeId === employee.id && vacation.startDate <= date && vacation.endDate >= date)) continue;
        if (chance(0.05)) continue;
        if (employee.code === "EMP-0008" && month === 10 && day === 15) {
          const checkIn = buildTimestamp(date, minutes(employee.scheduledStart) + 12);
          const computation = computeAttendance({ date, checkIn, checkOut: null, schedule: employee });
          attendance.push({ id: `att_${++attendanceId}`, employeeId: employee.id, date, checkIn, checkOut: null, breakMinutes: computation.breakMinutes, lateMinutes: computation.lateMinutes, lateCount: computation.lateCount, earlyLeaveMinutes: computation.earlyLeaveMinutes, overtimeMinutes: computation.overtimeMinutes, workedMinutes: computation.workedMinutes, source: "RELOJ" });
          continue;
        }
        const late = chance(0.10) ? randInt(5, 25) : 0;
        const overtime = chance(0.15) ? randInt(30, 90) : 0;
        const checkIn = buildTimestamp(date, minutes(employee.scheduledStart) + late);
        const checkOut = buildTimestamp(date, minutes(employee.scheduledEnd) + overtime);
        const computation = computeAttendance({ date, checkIn, checkOut, schedule: employee });
        attendance.push({ id: `att_${++attendanceId}`, employeeId: employee.id, date, checkIn, checkOut, breakMinutes: computation.breakMinutes, lateMinutes: computation.lateMinutes, lateCount: computation.lateCount, earlyLeaveMinutes: computation.earlyLeaveMinutes, overtimeMinutes: computation.overtimeMinutes, workedMinutes: computation.workedMinutes, source: "RELOJ" });
      }
    }
  }
  await prisma.attendance.createMany({ data: attendance });

  const stages = await prisma.productionOrderStage.findMany({ where: { status: "COMPLETADA" }, take: 12, orderBy: { endDate: "desc" } });
  const piecework: Prisma.PieceworkEntryCreateManyInput[] = [];
  const pieceworkCodes = ["EMP-0002", "EMP-0003", "EMP-0010"];
  for (let month = 1; month <= 10; month++) {
    for (const code of pieceworkCodes) {
      const employee = employeeByCode.get(code)!;
      piecework.push({
        id: `piece_${month}_${code.slice(4)}`,
        employeeId: employee.id,
        date: dateAt(2026, month, 15),
        quantity: randInt(300, 700),
        unitRate: employee.pieceRate ?? 0,
        description: `Producción ${MONTH_NAMES[month - 1]}`,
        productionOrderStageId: chance(0.3) && stages.length ? stages[(month + Number(code.slice(-1))) % stages.length].id : null,
        createdById: "rrhh",
      });
    }
  }
  await prisma.pieceworkEntry.createMany({ data: piecework });

  for (let month = 1; month <= 9; month++) {
    const range = monthRange(2026, month);
    const status = month <= 8 ? "PAGADA" : "CERRADA";
    const periodId = `pay_2026_${String(month).padStart(2, "0")}`;
    const number = `LIQ-2026-${String(month).padStart(2, "0")}`;
    const rows = employees.map((employee) => {
      const employeeAttendance = attendance.filter((record) => record.employeeId === employee.id && record.date >= range.start && record.date <= range.end);
      const employeePieces = piecework.filter((record) => record.employeeId === employee.id && record.date >= range.start && record.date <= range.end);
      const vacationDays = vacationDaysFor(employee.id, range.start, range.end, employee.workDays);
      const item = buildPayrollItem({
        employee,
        periodStart: range.start,
        periodEnd: range.end,
        asOf: range.end,
        attendance: employeeAttendance,
        pieces: employeePieces,
        vacationDays,
      });
      return { employeeId: employee.id, item };
    });
    const totals = payrollTotals(rows.map((row) => row.item));
    let expenseId: string | null = null;
    if (status === "PAGADA") {
      const expense = await prisma.expense.create({
        data: {
          id: `exp_pay_2026_${String(month).padStart(2, "0")}`,
          date: range.end,
          categoryId: "cat_5",
          voucherNumber: number,
          description: `Liquidación de sueldos ${String(month).padStart(2, "0")}/2026`,
          amount: totals.netTotal,
          taxRate: 0,
          paymentMethodId: "pm_TRANSFERENCIA",
          paidFromCash: false,
          userId: "rrhh",
        },
      });
      expenseId = expense.id;
    }
    await prisma.payrollPeriod.create({
      data: {
        id: periodId,
        number,
        type: "MENSUAL",
        year: 2026,
        month,
        startDate: range.start,
        endDate: range.end,
        status,
        ...totals,
        closedAt: range.end,
        paidAt: status === "PAGADA" ? range.end : null,
        paymentMethodId: status === "PAGADA" ? "pm_TRANSFERENCIA" : null,
        paidFromCash: false,
        expenseId,
        userId: "rrhh",
      },
    });
    await prisma.payrollItem.createMany({
      data: rows.map(({ employeeId, item }) => ({
        payrollId: periodId,
        employeeId,
        ...item,
        concepts: item.concepts as Prisma.InputJsonValue,
      })),
    });
  }

  const october = monthRange(2026, 10);
  const octoberId = "pay_2026_10";
  const octoberRows = employees.map((employee) => {
    const employeeAttendance = attendance.filter((record) => record.employeeId === employee.id && record.date >= october.start && record.date <= today);
    const employeePieces = piecework.filter((record) => record.employeeId === employee.id && record.date >= october.start && record.date <= today);
    const vacationDays = vacationDaysFor(employee.id, october.start, october.end, employee.workDays);
    const item = buildPayrollItem({
      employee,
      periodStart: october.start,
      periodEnd: october.end,
      asOf: today,
      attendance: employeeAttendance,
      pieces: employeePieces,
      vacationDays,
    });
    return { employeeId: employee.id, item };
  });
  const octoberTotals = payrollTotals(octoberRows.map((row) => row.item));
  await prisma.payrollPeriod.create({
    data: {
      id: octoberId,
      number: "LIQ-2026-10",
      type: "MENSUAL",
      year: 2026,
      month: 10,
      startDate: october.start,
      endDate: october.end,
      status: "BORRADOR",
      ...octoberTotals,
      userId: "rrhh",
    },
  });
  await prisma.payrollItem.createMany({
    data: octoberRows.map(({ employeeId, item }) => ({
      payrollId: octoberId,
      employeeId,
      ...item,
      concepts: item.concepts as Prisma.InputJsonValue,
    })),
  });

  console.log(`RRHH: ${employees.length} empleados · ${attendance.length} marcas · ${piecework.length} destajos · 10 liquidaciones`);
}
```

- [ ] **Step 2: Modificar el seed principal**

En `prisma/seed.ts`:

1. Importar `seedHR`:
```ts
import { seedHR } from "./seed/hr";
```

2. Agregar las tablas nuevas al inicio del `TRUNCATE` de `cleanup()`:
```sql
"PayrollItem", "PayrollPeriod", "PieceworkEntry", "VacationRequest", "Attendance", "Employee",
```

3. Después de `await seedProduction(data, commercial);` y antes de `adjustLowStock`, llamar:
```ts
await seedHR();
console.log("Empleados, asistencia, liquidaciones y recibos listos.");
```

4. Agregar al objeto `counts`:
```ts
empleados: await prisma.employee.count(),
liquidaciones: await prisma.payrollPeriod.count(),
```

- [ ] **Step 3: Ejecutar el seed**

Run: `npx prisma db seed`
Expected: termina sin errores y muestra los conteos de empleados y liquidaciones.

Run: `npx prisma studio` (opcional) para verificar empleados, asistencias, liquidaciones y gastos.

- [ ] **Step 4: Verificar datos clave**

Run:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); (async () => { console.log(await p.employee.count(), await p.attendance.count(), await p.payrollPeriod.count(), await p.payrollItem.count()); await p.$disconnect(); })();"
```
Expected: `10` empleados, más de 2000 asistencias, `10` liquidaciones, `100` ítems.

- [ ] **Step 5: Commitear**

```bash
git add prisma/seed/hr.ts prisma/seed.ts
git commit -m "feat(rrhh): agrega datos demo de empleados, asistencia y liquidaciones"
```

---

## Task 9: E2E, documentación y verificación final

**Files:**
- Create: `e2e/rrhh.spec.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Crear el smoke E2E de RRHH**

`e2e/rrhh.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username = "admin") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
}

test("RRHH: panel y empleados con legajo", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh");
  await expect(page.getByRole("heading", { name: "Recursos Humanos" })).toBeVisible();
  await expect(page.getByText("Empleados activos")).toBeVisible();
  await page.goto("/rrhh/empleados");
  await expect(page.locator("thead th").filter({ hasText: "Legajo" })).toBeVisible();
  await expect(page.locator("tbody").getByText(/EMP-0001/).first()).toBeVisible();
});

test("RRHH: alta de empleado abre en modal", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/empleados");
  await page.getByRole("button", { name: "Nuevo empleado" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo empleado" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("RRHH: reloj con CI y PIN", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/reloj");
  await expect(page.getByLabel("CI con DV")).toBeVisible();
  await expect(page.getByLabel("PIN")).toBeVisible();
  await expect(page.getByRole("button", { name: /Marcar entrada/ })).toBeVisible();
  await expect(page.getByText("PIN 1234")).toBeVisible();
});

test("RRHH: recibo de sueldo en visor PDF.js", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/liquidaciones");
  await page.getByRole("link", { name: /LIQ-2026-10/ }).first().click();
  const receipt = page.locator('a[href^="/ver/recibo-sueldo/"]').first();
  await expect(receipt).toBeVisible();
  await receipt.click();
  await expect(page.getByText("PDF.js · Mozilla")).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const width = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
  expect(width).toBeGreaterThan(0);
});

test("RRHH: depósito no puede descargar recibo de sueldo", async ({ page, browser }) => {
  await login(page);
  await page.goto("/rrhh/liquidaciones");
  await page.getByRole("link", { name: /LIQ-2026-10/ }).first().click();
  const href = await page.locator('a[href^="/ver/recibo-sueldo/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  const itemId = href!.split("/").pop();
  const baseURL = process.env.E2E_BASE_URL ?? "https://esmarlab.duckdns.org";
  const context = await browser.newContext({ baseURL });
  const deposito = await context.newPage();
  await login(deposito, "deposito");
  const response = await deposito.context().request.get(`${baseURL}/api/pdf/recibo-sueldo/${itemId}`);
  expect(response.status()).toBe(403);
  await context.close();
});
```

- [ ] **Step 2: Actualizar `AGENTS.md`**

Agregar en la sección de estado y usuarios:

- Etapa 11: módulo RRHH con empleados, reloj PIN, asistencia, liquidaciones, aguinaldo, vacaciones y recibos.
- Usuario demo `rrhh` / `demo1234`.
- En el mapa: `src/app/(app)/rrhh/` (empleados, reloj, asistencia, liquidaciones, vacaciones, aguinaldo); `src/lib/payroll.ts`; `src/lib/pdf/payroll-receipt-pdf.tsx`.
- En tests: Vitest cubre jornada, tardanzas, extras, jornal, destajo, mixto, IPS, aguinaldo y vacaciones; Playwright cubre panel, modal de empleado, reloj, visor de recibo y permiso 403.
- En comandos: `npx prisma db seed` carga 10 empleados, asistencias y liquidaciones demo.

- [ ] **Step 3: Correr la verificación completa**

```bash
npm run lint
npm test
npm run build
```

Expected: lint sin errores, todos los tests PASS, build exitoso.

Para E2E local:

```bash
npm run start &
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Si se corre contra la demo, primero desplegar (push a `main` + deploy en Dokploy) y usar:

```bash
npm run test:e2e
```

Expected: todos los tests E2E PASS.

- [ ] **Step 4: Commitear**

```bash
git add e2e/rrhh.spec.ts AGENTS.md
git commit -m "test(rrhh): agrega smoke E2E y actualiza documentacion"
```

---

## Auto-revisión del plan

### Cobertura del spec

| Requisito del spec | Tarea |
| --- | --- |
| Rol RRHH, permisos, navegación | Task 1 |
| Ficha de empleado, CI, PIN, horario, pago | Task 3 |
| Reloj con PIN y marcas | Task 4 |
| Asistencia, tardanzas, extras, correcciones | Task 4 |
| Liquidación mensual, jornal, destajo, mixto | Task 2 + Task 5 |
| IPS 9% / 16,5% | Task 2 |
| Aguinaldo 1/12 | Task 2 + Task 6 |
| Vacaciones con saldo y aprobación | Task 2 + Task 6 |
| Pago con gasto y caja | Task 5 |
| Recibo PDF y visor | Task 5 |
| Panel RRHH y tarjeta del dashboard | Task 7 |
| Seed demo | Task 8 |
| Tests unitarios y E2E | Task 2 + Task 9 |
| Documentación | Task 9 |

### Consistencia de tipos y nombres

- `buildPayrollItem`, `computeAttendance`, `countVacationDays`, `expectedWorkdays`, `vacationEntitlement`, `payrollTotals`, `aguinaldoAmount` se definen en Task 2 y se usan en Tasks 3–8.
- `periodRange`, `currentPeriod`, `vacationBalance` se definen en Task 3 y se usan en Tasks 4–8.
- `saveEmployee`, `savePieceworkEntry`, `clockPunch`, `saveAttendance`, `createPayroll`, `updatePayrollItem`, `closePayroll`, `payPayroll`, `annulPayroll`, `generateAguinaldo`, `createVacationRequest`, `decideVacationRequest`, `cancelVacationRequest` se definen antes de usarse.
- Las rutas `/rrhh/...`, `/ver/recibo-sueldo/...` y `/api/pdf/recibo-sueldo/...` coinciden con el spec.
- Los campos de Prisma usados en las actions coinciden con el schema del Task 1.

### Riesgos de implementación

- **Prisma + enums:** después de agregar `RRHH` hay que correr `npx prisma generate`; el build falla si no se regenera.
- **Fechas:** todas las fechas de formulario usan `yyyy-MM-dd`; las horas usan `HH:mm`. No mezclar con `formatDate` en defaults de `DatePicker`.
- **Zona horaria:** usar siempre `America/Asuncion` y fechas al mediodía para días sin hora.
- **Neto negativo:** el cierre se bloquea; los tests lo cubren.
- **Seed:** debe correr después de maestros y producción (talleres y etapas existentes) y antes de finalizar. No volver a truncar después.
- **E2E:** el test de recibo depende de que exista `LIQ-2026-10` en el seed; si se cambia el número, actualizar el test.









