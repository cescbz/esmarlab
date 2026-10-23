# Módulo RRHH — Diseño para la demo de Esmar

- **Fecha:** 2026-10-23
- **Estado:** aprobado para implementación
- **Contexto:** demo funcional de Esmar SRL. Todos los cálculos y documentos son simulados y deben rotularse **DEMO — SIN VALIDEZ FISCAL**.

## 1. Objetivo

Agregar a la demo un módulo de Recursos Humanos que cubra:

- Ficha de empleado.
- Registro de entrada y salida con reloj por CI + PIN.
- Asistencia diaria y planilla mensual con correcciones.
- Liquidación mensual de salarios, jornales, destajo y mixto.
- Horas extras, llegadas tardías (tardanzas) y ausencias.
- Aguinaldo.
- Vacaciones con saldo y solicitudes con aprobación.
- Recibos de sueldo en PDF con visor dentro de la app.

## 2. Alcance aprobado

El módulo se construye dentro de la misma aplicación, con la misma base PostgreSQL, login, permisos, componentes y visor de PDF. No es un sistema separado.

### 2.1 Pantallas

| Ruta | Propósito |
| --- | --- |
| `/rrhh` | Panel con KPIs y accesos rápidos. |
| `/rrhh/empleados` | Listado, alta y edición de empleados. |
| `/rrhh/empleados/[id]` | Ficha del empleado con asistencia, vacaciones y liquidaciones. |
| `/rrhh/reloj` | Kiosco para marcar entrada/salida con CI + PIN. |
| `/rrhh/asistencia` | Resumen mensual por empleado. |
| `/rrhh/asistencia/[employeeId]` | Detalle diario y corrección de marcas. |
| `/rrhh/liquidaciones` | Períodos mensuales y de aguinaldo. |
| `/rrhh/liquidaciones/[id]` | Detalle de la liquidación, ajustes, cierre y pago. |
| `/rrhh/vacaciones` | Solicitudes y saldos. |
| `/rrhh/aguinaldo` | Cálculo anual y generación de la liquidación. |
| `/ver/recibo-sueldo/[itemId]` | Visor PDF.js del recibo. |
| `/api/pdf/recibo-sueldo/[itemId]` | Descarga del recibo. |

### 2.2 Navegación

Nuevo grupo **RRHH** en el menú lateral, después de Producción:

- Empleados
- Reloj
- Asistencia
- Liquidaciones
- Vacaciones
- Aguinaldo

El grupo solo se muestra a los roles con acceso (`canAccess` ya filtra los ítems).

### 2.3 Formularios

- Empleado: alta y edición en modal (`FormDialog`), con secciones Personales, Laborales, Horario y Pago.
- Corrección de marca: modal con hora de entrada y salida.
- Solicitud de vacaciones: modal con rango de fechas.
- Nuevo período de liquidación: modal con año y mes.
- Ajustes de ítem de liquidación: modal para bonificaciones y otros descuentos.

Fechas con `DatePicker`; no se usan inputs nativos de fecha. Las horas de corrección usan inputs de hora (`type="time"`), no de fecha.

Todas las pantallas siguen el sistema de diseño existente (tokens, IBM Plex, componentes de `src/components/ui`). Las tablas tienen estado vacío, las acciones muestran toasts y las acciones destructivas piden confirmación.

## 3. Fuera de alcance

- Reloj biométrico o hardware externo.
- Calendario de feriados y recargos por feriado.
- Impuesto a la renta personal.
- Multiempresa o multi-sucursal.
- Archivo bancario para transferencias.
- Liquidaciones semanales o quincenales.
- Aprobación de horas extras por separado.
- Foto del empleado o carga de documentos.
- Descuentos judiciales, sindicales o préstamos con amortización.

## 4. Roles y permisos

### 4.1 Nuevo rol

Agregar `RRHH` al enum `Role` de Prisma y a `AppRole`.

| Rol | Acceso |
| --- | --- |
| ADMIN | Total. |
| GERENCIA | Lectura de RRHH y PDFs; no crea ni modifica. |
| RRHH | Acceso completo al módulo, liquidaciones, pagos y PDFs. |
| VENTAS / CAJA / DEPOSITO / PRODUCCION | Sin acceso. |

### 4.2 Archivos a actualizar

- `prisma/schema.prisma`: `Role` + `RRHH`.
- `src/lib/roles.ts`: `AppRole`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`, `ALL_ROLES`, `ACCESS`, `canWrite`, `PdfKind`, `PDF_ACCESS`.
- `src/components/layout/app-shell.tsx`: grupo de navegación e íconos, títulos de página.
- `prisma/seed.ts`: usuario `rrhh`, nombre "Patricia Ocampos", contraseña `demo1234`.
- `src/app/ver/...` y `src/app/api/pdf/...`: permisos de PDF.

Reglas:

- `canAccess("RRHH", "/rrhh...")` → `true`.
- `canWrite("RRHH", "rrhh")` → `true`.
- `canWrite("GERENCIA", "rrhh")` → `false`.
- `canViewPdf("RRHH", "recibo-sueldo")` → `true`; también ADMIN y GERENCIA.

## 5. Modelo de datos

### 5.1 Enums nuevos

```prisma
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

### 5.2 `Employee`

```prisma
model Employee {
  id                    String         @id @default(cuid())
  code                  String         @unique
  firstName             String
  lastName              String
  ci                    String         @unique
  birthDate             DateTime?
  phone                 String?
  email                 String?
  address               String?
  emergencyContact      String?
  position              String
  department            String
  workshopId            String?
  workshop              Workshop?      @relation(fields: [workshopId], references: [id])
  hireDate              DateTime
  endDate               DateTime?
  status                EmployeeStatus @default(ACTIVO)
  payType               PayType
  monthlySalary         Int?
  dailyRate             Int?
  pieceRate             Int?
  scheduledStart        String         @default("07:30")
  scheduledEnd          String         @default("17:00")
  lunchMinutes          Int            @default(60)
  workDays              Int[]          @default([1, 2, 3, 4, 5, 6])
  lateToleranceMinutes  Int            @default(10)
  pinHash               String
  vacationDaysOverride  Int?
  notes                 String?
  attendance            Attendance[]
  pieceworkEntries      PieceworkEntry[]
  vacationRequests      VacationRequest[]
  payrollItems          PayrollItem[]
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@index([status])
  @@index([department])
}
```

Notas:

- `code` es el legajo visible: `EMP-0001`.
- `ci` se guarda completa con DV (`1234567-8`) y se valida con la misma función módulo 11 que usan clientes y proveedores.
- `workDays` usa ISO: 1 = lunes, 7 = domingo.
- `pinHash` usa bcrypt. El PIN nunca se guarda en texto plano.
- `dailyRate` en empleados `DESTAJO` es un **jornal de referencia opcional** para calcular tardanzas y extras. El pago base sigue siendo por pieza.
- `vacationDaysOverride` permite fijar días de vacaciones a mano; si es nulo se calcula por antigüedad.

### 5.3 `Attendance`

```prisma
model Attendance {
  id                 String           @id @default(cuid())
  employeeId         String
  employee           Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date               DateTime
  checkIn            DateTime?
  checkOut           DateTime?
  breakMinutes       Int              @default(0)
  lateMinutes        Int              @default(0)
  earlyLeaveMinutes  Int              @default(0)
  overtimeMinutes    Int              @default(0)
  workedMinutes      Int              @default(0)
  lateCount          Int              @default(0)
  source             AttendanceSource @default(RELOJ)
  notes              String?
  correctedById      String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([employeeId, date])
  @@index([date])
}
```

- Una fila por empleado y día. `date` se normaliza a las 12:00 de Asunción para evitar corrimientos de zona horaria.
- Si falta `checkOut`, la fila queda incompleta: no cuenta como día trabajado y se marca en la UI.

### 5.4 `PieceworkEntry`

```prisma
model PieceworkEntry {
  id                       String                @id @default(cuid())
  employeeId               String
  employee                 Employee              @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date                     DateTime
  quantity                 Int
  unitRate                 Int
  description              String?
  productionOrderStageId   String?
  productionOrderStage     ProductionOrderStage? @relation(fields: [productionOrderStageId], references: [id])
  createdById              String?
  createdAt                DateTime              @default(now())

  @@index([employeeId, date])
  @@index([productionOrderStageId])
}
```

- Permite cargar unidades a mano o imputarlas desde una etapa de producción.
- `unitRate` se precarga con `Employee.pieceRate`, pero puede variar por trabajo.

### 5.5 `VacationRequest`

```prisma
model VacationRequest {
  id           String         @id @default(cuid())
  employeeId   String
  employee     Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  startDate    DateTime
  endDate      DateTime
  days         Int
  status       VacationStatus @default(PENDIENTE)
  reason       String?
  requestedAt  DateTime       @default(now())
  decidedAt    DateTime?
  decidedBy    String?
  notes        String?

  @@index([employeeId, status])
  @@index([startDate, endDate])
}
```

- `days` se calcula con los días laborales del empleado dentro del rango.
- Solicitud aprobada descuenta saldo; pendiente se muestra aparte.
- No se permiten solapamientos con solicitudes pendientes o aprobadas del mismo empleado.

### 5.6 `PayrollPeriod`

```prisma
model PayrollPeriod {
  id                String         @id @default(cuid())
  number            String         @unique
  type              PayrollType
  year              Int
  month             Int
  startDate         DateTime
  endDate           DateTime
  status            PayrollStatus  @default(BORRADOR)
  grossTotal        Int            @default(0)
  ipsEmployeeTotal  Int            @default(0)
  ipsEmployerTotal  Int            @default(0)
  deductionsTotal   Int            @default(0)
  netTotal          Int            @default(0)
  extraTotal        Int            @default(0)
  pieceTotal        Int            @default(0)
  lateTotal         Int            @default(0)
  absenceTotal      Int            @default(0)
  vacationTotal     Int            @default(0)
  closedAt          DateTime?
  paidAt            DateTime?
  paymentMethodId   String?
  paymentMethod     PaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  paidFromCash      Boolean        @default(false)
  expenseId         String?        @unique
  expense           Expense?       @relation(fields: [expenseId], references: [id])
  notes             String?
  userId            String?
  items             PayrollItem[]
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@unique([type, year, month])
  @@index([status])
}
```

- `number`: `LIQ-2026-10` para mensual, `AGU-2026` para aguinaldo.
- El aguinaldo usa `month = 12`.
- Se agregan las relaciones inversas en `Workshop`, `ProductionOrderStage`, `PaymentMethod` y `Expense`.

### 5.7 `PayrollItem`

```prisma
model PayrollItem {
  id                String        @id @default(cuid())
  payrollId         String
  payroll           PayrollPeriod @relation(fields: [payrollId], references: [id], onDelete: Cascade)
  employeeId        String
  employee          Employee      @relation(fields: [employeeId], references: [id])
  payType           PayType
  baseAmount        Int           @default(0)
  workedDays        Int           @default(0)
  pieceUnits        Int           @default(0)
  pieceAmount       Int           @default(0)
  extraMinutes      Int           @default(0)
  extraAmount       Int           @default(0)
  lateMinutes       Int           @default(0)
  lateDeduction     Int           @default(0)
  absenceDays       Int           @default(0)
  absenceDeduction  Int           @default(0)
  vacationDays      Int           @default(0)
  vacationAmount    Int           @default(0)
  otherEarnings     Int           @default(0)
  otherDeductions   Int           @default(0)
  grossAmount       Int           @default(0)
  ipsBase           Int           @default(0)
  ipsEmployee       Int           @default(0)
  ipsEmployer       Int           @default(0)
  netAmount         Int           @default(0)
  concepts          Json?
  notes             String?

  @@unique([payrollId, employeeId])
  @@index([employeeId])
}
```

- `concepts` guarda detalle auxiliar (por ejemplo, meses incluidos en el aguinaldo o si hubo ajuste).
- `otherEarnings` y `otherDeductions` son montos manuales editables solo en estado `BORRADOR`.

## 6. Reglas de cálculo

Todo el cálculo vive en `src/lib/payroll.ts` como funciones puras, sin acceso a base de datos, para poder testearlo con Vitest. Las server actions solo leen datos, llaman a las funciones y guardan en `prisma.$transaction`.

### 6.1 Convenciones

- Zona horaria: `America/Asuncion`.
- Moneda: guaraníes enteros. Se calcula en números y se redondea con `Math.round` en cada concepto.
- Formato de montos: `formatGs()`.
- Formato de fechas: `formatDate()` (`dd/mm/aaaa`).
- Semana ISO: 1 = lunes, 7 = domingo.

### 6.2 Jornada y asistencia

Para un empleado con `scheduledStart`, `scheduledEnd`, `lunchMinutes`, `workDays` y `lateToleranceMinutes`:

- `scheduledMinutes = minutos(scheduledEnd) − minutos(scheduledStart) − lunchMinutes`.
- `lateMinutes = max(0, minutos(checkIn) − (minutos(scheduledStart) + lateToleranceMinutes))` en día laboral.
- `lateCount = 1` si `lateMinutes > 0`.
- `earlyLeaveMinutes = max(0, minutos(scheduledEnd) − minutos(checkOut))`.
- `breakMinutes = span > 360 ? lunchMinutes : 0`, donde `span = minutos(checkOut) − minutos(checkIn)`.
- `workedMinutes = max(0, span − breakMinutes)`.
- `overtimeMinutes`:
  - Día laboral: `max(0, workedMinutes − scheduledMinutes)`.
  - Día no laboral: `workedMinutes` completo.
- Sin `checkOut`, la fila queda incompleta: `workedMinutes = 0`, `overtimeMinutes = 0` y se muestra advertencia.

### 6.3 Días esperados y ausencias

- `expectedWorkdays`: días laborales del período, desde `max(period.startDate, hireDate)` hasta `min(period.endDate, endDate ?? period.endDate)`.
- En período `BORRADOR`, el límite superior también se corta en la fecha de hoy; así no se cuentan como ausencias los días futuros.
- `absenceDays = max(0, expectedWorkdays − díasConAsistenciaCompleta − vacationDays)`.
- Días con asistencia completa: filas con `checkIn` y `checkOut` en día laboral.
- Trabajar en día no laboral no descuenta ausencia; se paga como extra.

### 6.4 Pago base

| Tipo | Base |
| --- | --- |
| `MENSUAL` | `monthlySalary` completo del mes. |
| `JORNAL` | `dailyRate × workedDays` + `dailyRate × vacationDays`. |
| `DESTAJO` | `Σ (PieceworkEntry.quantity × PieceworkEntry.unitRate)` del período. |
| `MIXTO` | `monthlySalary` + destajo del período. |

- `vacationDays` se toman de solicitudes `APROBADA` que se solapan con el período.
- Para `MENSUAL` y `MIXTO`, las vacaciones ya están cubiertas por el sueldo; `vacationAmount = 0`.
- Para `JORNAL`, `vacationAmount = dailyRate × vacationDays`.
- Para `DESTAJO` con `dailyRate` de referencia, `vacationAmount = dailyRate × vacationDays`; sin referencia, `0`.

### 6.5 Horas extras

- Recargo del **50%** para horas extras en día laboral.
- Recargo del **100%** para horas trabajadas en día no laboral.
- `hourlyRate`:
  - `MENSUAL` / `MIXTO`: `monthlySalary / 30 / (scheduledMinutes / 60)`.
  - `JORNAL`: `dailyRate / (scheduledMinutes / 60)`.
  - `DESTAJO`: `dailyRate / (scheduledMinutes / 60)` si hay jornal de referencia; si no, `0`.
- `extraAmount = round(hourlyRate × (1 + recargo) × minutosExtras / 60)`.
- Si `hourlyRate = 0`, el monto extra es `0` y la UI lo advierte.

### 6.6 Llegadas tardías y ausencias

- `dailyRateForDeduction`:
  - `MENSUAL` / `MIXTO`: `monthlySalary / 30`.
  - `JORNAL`: `dailyRate`.
  - `DESTAJO`: `dailyRate` de referencia si existe; si no, `0`.
- `lateDeduction = min(dailyRateForDeduction, round((dailyRateForDeduction / scheduledMinutes) × lateMinutes))`. El tope evita descontar más de un día por una marca extrema.
- `absenceDeduction`:
  - `MENSUAL` / `MIXTO`: `round((monthlySalary / 30) × absenceDays)`.
  - `JORNAL`: `dailyRate × absenceDays`.
  - `DESTAJO`: `0` (no hay base garantizada).
- La tolerancia ya está incluida en `lateMinutes`; si la llegada está dentro de la tolerancia, no hay descuento.

### 6.7 IPS

- Base imponible: `baseAmount + vacationAmount + extraAmount + otherEarnings`.
- `ipsEmployee = round(ipsBase × 0.09)`.
- `ipsEmployer = round(ipsBase × 0.165)` (informativo, no se descuenta al empleado).
- El aguinaldo no lleva IPS en esta demo.
- Todo cálculo legal se rotula como **simplificado para demo**.

### 6.8 Total del ítem

- `grossAmount = baseAmount + vacationAmount + extraAmount + otherEarnings`.
- `totalDeductions = lateDeduction + absenceDeduction + ipsEmployee + otherDeductions`.
- `netAmount = grossAmount − totalDeductions`.
- Se permite un neto negativo en borrador para que RRHH lo vea y ajuste. El cierre se bloquea si algún ítem queda con neto negativo.

### 6.9 Aguinaldo

- Para cada empleado: `Σ grossAmount` de sus ítems en períodos `MENSUAL` del año, en estado `CERRADA` o `PAGADA`.
- `aguinaldo = round(totalGanado / 12)`.
- `baseAmount = totalGanado`; `grossAmount = aguinaldo`; `ipsEmployee = 0`; `ipsEmployer = 0`; `otherDeductions` editable; `netAmount = aguinaldo − otherDeductions`.
- La pantalla de aguinaldo muestra además una **proyección** que incluye el período `BORRADOR` del año, rotulada como tal. La liquidación que se genera usa solo períodos `CERRADA` o `PAGADA`.
- Si el año todavía no terminó, la liquidación generada se rotula **provisoria**.
- Al cerrar el año, se puede recalcular con los períodos definitivos.

### 6.10 Vacaciones

- Antigüedad al 31/12 del año de cálculo:
  - 10 años o más: 30 días.
  - 5 años o más: 18 días.
  - 1 año o más: 12 días.
  - Menos de 1 año: `min(12, meses completos trabajados)` días (proporcional simplificado).
- `vacationDaysOverride` reemplaza el cálculo.
- `takenDays = Σ días de solicitudes APROBADAS del año`.
- `pendingDays = Σ días de solicitudes PENDIENTES del año`.
- `availableDays = max(0, entitlement − takenDays)`.
- Los días de una solicitud se cuentan con los `workDays` del empleado, sin feriados.
- Aprobación: valida saldo suficiente y ausencia de solapamiento; registra `decidedAt` y `decidedBy`.
- Rechazo: registra estado y decisión; no afecta saldo.
- Si una solicitud se aprueba después del cierre de una liquidación, el ajuste se refleja en la próxima liquidación; no se reabre un período cerrado.

## 7. Flujos y transacciones

### 7.1 Alta y edición de empleado

- Server action `saveEmployee(values)`.
- Valida con Zod: nombre, apellido, CI con DV, cargo, departamento, tipo de pago, montos según tipo, horario, días laborales, PIN de 4 dígitos en alta.
- Validaciones específicas: `workDays` no vacío y con valores 1–7; `scheduledEnd` posterior a `scheduledStart`; email válido si se informa; `monthlySalary` obligatorio para `MENSUAL`/`MIXTO`; `dailyRate` obligatorio para `JORNAL`; `pieceRate` obligatorio para `DESTAJO`/`MIXTO`; PIN exactamente de 4 dígitos.
- Genera legajo `EMP-0001` secuencial dentro de la transacción.
- Hashea el PIN con bcrypt. En edición, PIN vacío conserva el actual.
- No se elimina un empleado con historial: se cambia `status` a `INACTIVO` con confirmación.
- Revalida `/rrhh/empleados` y la ficha.

### 7.2 Reloj

- Server action `clockPunch({ ci, pin })`:
  1. Requiere sesión con rol ADMIN o RRHH (el kiosco se abre con esa sesión; GERENCIA solo puede mirar).
  2. Busca empleado activo por `ci`.
  3. Compara el PIN con `bcrypt.compare`. Error genérico "CI o PIN incorrecto".
  4. Si hoy cae dentro de una solicitud de vacaciones aprobada, rechaza la marca.
  5. Si no hay fila de hoy: crea `checkIn = ahora`, `source = RELOJ`.
  6. Si hay fila sin `checkOut`: completa `checkOut = ahora` y recalcula todos los campos.
  7. Si ya tiene entrada y salida: rechaza con "Ya registraste entrada y salida hoy. Pedí una corrección a RRHH."
  8. Devuelve nombre, tipo de marca, hora y minutos de tardanza/extra para el feedback.
- La pantalla muestra reloj en vivo, campos CI y PIN, teclado numérico, botón grande y las marcas del día.
- Para GERENCIA, el reloj se muestra en modo consulta y el botón de marca está deshabilitado.
- Para la demo, todos los empleados del seed usan PIN `1234`, mostrado como ayuda en pantalla.

### 7.3 Asistencia manual y correcciones

- Server action `saveAttendance(values)`:
  - Requiere ADMIN o RRHH.
  - Crea o edita una fila por empleado y fecha.
  - Valida que `checkOut` sea posterior a `checkIn`.
  - Recalcula tardanza, salida anticipada, horas trabajadas y extras.
  - `source = MANUAL` o `CORRECCION`; guarda `correctedById`.
- La planilla mensual muestra: días trabajados, tardanzas (cantidad y minutos), extras (horas y minutos), ausencias, vacaciones y marcas incompletas.
- El detalle diario permite corregir, agregar una marca faltante y ver observaciones.

### 7.4 Destajo

- Server action `savePieceworkEntry(values)`:
  - Requiere ADMIN o RRHH.
  - Empleado, fecha, cantidad, tarifa unitaria, descripción y etapa de producción opcional.
  - Si se elige una etapa, precarga cantidad completada y descripción; RRHH puede ajustar.
- Las entradas se listan en la ficha del empleado y en el detalle de la liquidación.
- El total de piezas del período alimenta la liquidación.

### 7.5 Liquidación mensual

- `createPayroll({ year, month })`:
  - Requiere ADMIN o RRHH.
  - Verifica que no exista `MENSUAL` para ese año/mes.
  - Crea `PayrollPeriod` en `BORRADOR` con `number = LIQ-YYYY-MM`.
  - Calcula ítems para empleados `ACTIVO` (y `LICENCIA` si tienen datos) con la lógica de la sección 6.
  - Guarda totales.
  - Todo en una transacción.
- `recalculatePayroll(id)`:
  - Solo `BORRADOR`.
  - Recalcula campos automáticos y conserva `otherEarnings`, `otherDeductions` y `notes` por empleado.
- `updatePayrollItem(itemId, values)`:
  - Solo `BORRADOR`.
  - Edita bonificaciones, otros descuentos y notas; recalcula neto y totales del período.
- `closePayroll(id)`:
  - Solo `BORRADOR`.
  - Recalcula totales, valida que no haya netos negativos y pasa a `CERRADA` con `closedAt`.
  - Después del cierre no se editan ítems.
- `annulPayroll(id)`:
  - Solo `BORRADOR` o `CERRADA`; nunca `PAGADA`.
  - Pasa a `ANULADA` con confirmación.
- `payPayroll(id, { paymentMethodId, paidFromCash })`:
  - Solo `CERRADA`.
  - Si `paidFromCash`, exige una sesión de caja abierta.
  - En transacción: crea `Expense` con categoría **Sueldos**, `taxRate = 0`, descripción "Liquidación de sueldos MM/AAAA" o "Aguinaldo AAAA", `voucherNumber = period.number`, monto `netTotal`, `paidFromCash` y `cashSessionId` si corresponde.
  - Si es efectivo, crea `CashMovement` tipo `EGRESO_GASTO`.
  - Actualiza el período a `PAGADA`, con `paidAt`, medio de pago y `expenseId`.
  - Revalida `/rrhh`, `/gastos` y `/caja`.

### 7.6 Aguinaldo

- `generateAguinaldo(year)`:
  - Requiere ADMIN o RRHH.
  - Verifica que no exista `AGUINALDO` para ese año.
  - Crea `PayrollPeriod` tipo `AGUINALDO`, mes 12, número `AGU-AAAA`.
  - Calcula ítems con la sección 6.9.
  - Estado `BORRADOR` y nota "Provisorio" si el año no terminó.
- Se recalcula, cierra y paga con las mismas acciones que la liquidación mensual.

### 7.7 Vacaciones

- `createVacationRequest(values)`:
  - Requiere ADMIN o RRHH.
  - Calcula días laborales, valida solapamientos, guarda `PENDIENTE`.
- `decideVacationRequest(id, decision)`:
  - Requiere ADMIN o RRHH.
  - `APROBADA`: valida saldo disponible y solapamiento; guarda decisión.
  - `RECHAZADA`: guarda decisión.
- `cancelVacationRequest(id)`:
  - Solo `PENDIENTE`; pasa a `CANCELADA`.
- La pantalla muestra saldos por empleado y el historial de solicitudes.

## 8. PDF y visor

- Componente `src/lib/pdf/payroll-receipt-pdf.tsx` con `@react-pdf/renderer`.
- Título: **RECIBO DE SUELDO** o **RECIBO DE AGUINALDO**.
- Datos: empresa, empleado (legajo, nombre, CI, cargo), período, fecha de pago, conceptos, haberes, descuentos, IPS, neto y monto en letras (`numeroALetras`).
- Conceptos: sueldo/jornal/destajo, días trabajados, unidades, horas extras, vacaciones, tardanzas, ausencias, otros.
- Marcas de agua y leyenda **DEMO — SIN VALIDEZ FISCAL**.
- Firmas: empleado y responsable de RRHH.
- Ruta API con `runtime = "nodejs"`, autenticación y `canViewPdf(role, "recibo-sueldo")`; 401 sin sesión, 403 sin permiso, 404 inexistente.
- Ruta `/ver/recibo-sueldo/[itemId]` con `PdfViewer` y botón de descarga.
- El recibo se puede ver desde el detalle de la liquidación y desde la ficha del empleado.

## 9. Integraciones

### 9.1 Producción

- `PieceworkEntry.productionOrderStageId` permite imputar unidades completadas de una etapa.
- La pantalla de destajo puede listar etapas con `completedQuantity > 0` del período.
- No se modifica el flujo actual de producción; solo se agrega la relación inversa.

### 9.2 Gastos y caja

- El pago de una liquidación genera un gasto de categoría **Sueldos**.
- Si se paga desde caja, impacta la sesión abierta como `EGRESO_GASTO`.
- El gasto usa `taxRate = 0` porque los sueldos no llevan IVA.
- No se paga automáticamente el IPS patronal; queda como obligación separada.

### 9.3 Dashboard principal

- Se agrega una tarjeta "Planilla del mes" para ADMIN, GERENCIA y RRHH con el neto del último período cerrado o pagado, y enlace a liquidaciones.
- Si no hay períodos, muestra `—`.

## 10. Datos demo (seed)

### 10.1 Usuario

- `rrhh` / `demo1234`, nombre "Patricia Ocampos", rol `RRHH`.

### 10.2 Empleados

Diez empleados con legajos `EMP-0001` a `EMP-0010`, CI válidas con DV, cargos y tipos de pago variados:

| Legajo | Nombre | Cargo | Departamento | Tipo | Referencia |
| --- | --- | --- | --- | --- | --- |
| EMP-0001 | Ramona Cáceres | Costurera | Producción | JORNAL | 150.000/día |
| EMP-0002 | Derlis Aquino | Cortador | Producción | DESTAJO | 12.000/unidad |
| EMP-0003 | Gloria Medina | Costurera | Producción | DESTAJO | 10.000/unidad |
| EMP-0004 | Osvaldo Rojas | Encargado de taller | Producción | MENSUAL | 5.500.000/mes |
| EMP-0005 | Liz Sánchez | Vendedora | Ventas | MENSUAL | 4.200.000/mes |
| EMP-0006 | Jorge Fleitas | Cajero | Administración | MENSUAL | 4.000.000/mes |
| EMP-0007 | Nidia Benítez | Auxiliar de depósito | Depósito | JORNAL | 130.000/día |
| EMP-0008 | Rodrigo Villalba | Ayudante | Producción | JORNAL | 120.000/día |
| EMP-0009 | Celia Giménez | Administrativa | Administración | MENSUAL | 4.800.000/mes |
| EMP-0010 | Marcelo Ayala | Costurero | Producción | MIXTO | 3.200.000/mes + 6.000/unidad |

- Fechas de ingreso entre 2016 y 2025 para cubrir las franjas de vacaciones.
- Horarios: 07:00–16:00 o 07:30–17:00, con 60 minutos de almuerzo, lunes a sábado.
- PIN `1234` para todos.

### 10.3 Asistencia y destajo

- Asistencias de enero a octubre de 2026 para todos los empleados, con:
  - 85% de llegadas en hora.
  - 10% de llegadas tarde (5 a 25 minutos).
  - 5% de ausencias.
  - Horas extras ocasionales (30 a 90 minutos).
  - Una marca incompleta en octubre.
  - Sin marcas en días de vacaciones aprobadas.
- Entradas de destajo mensuales para `EMP-0002`, `EMP-0003` y `EMP-0010`, con cantidades entre 300 y 700 unidades.
- Algunas entradas vinculadas a etapas de producción existentes.
- El seed de RRHH usa un generador pseudoaleatorio determinista para que los totales sean estables entre ejecuciones.

### 10.4 Vacaciones

- Aprobadas: `EMP-0002` del 12 al 16 de enero; `EMP-0005` del 6 al 10 de julio.
- Pendientes: `EMP-0001` del 2 al 6 de noviembre; `EMP-0008` del 14 al 18 de diciembre.
- Rechazada: `EMP-0007` del 3 al 7 de agosto.

### 10.5 Liquidaciones

- Enero a septiembre de 2026: `CERRADA` o `PAGADA`.
- Enero a agosto: `PAGADA`, con gasto asociado en categoría Sueldos pagado por transferencia (`pm_TRANSFERENCIA`), `taxRate = 0` y `paidFromCash = false`.
- Septiembre: `CERRADA`, sin pago.
- Octubre: `BORRADOR`, con datos hasta la fecha de la demo.
- Totales calculados con las mismas funciones puras del sistema.
- Aguinaldo 2026: no se seedea como período; la pantalla muestra la proyección y permite generarlo.

### 10.6 Limpieza del seed

Agregar a `cleanup()` las tablas nuevas en orden seguro:

1. `PayrollItem`
2. `PayrollPeriod`
3. `PieceworkEntry`
4. `VacationRequest`
5. `Attendance`
6. `Employee`

`Employee` debe truncarse antes de `Workshop` y `ProductionOrderStage`; `PieceworkEntry` antes de `ProductionOrderStage`.

## 11. Pruebas y verificación

### 11.1 Unitarias (Vitest)

Archivo `src/lib/__tests__/payroll.test.ts`:

- Tardanza dentro y fuera de tolerancia.
- Salida anticipada y marca incompleta.
- Minutos trabajados y horas extras en día laboral y no laboral.
- Pago mensual, jornal, destajo y mixto.
- Descuento por ausencia y por tardanza.
- Recargo de extras 50% y 100%.
- IPS empleado y patronal.
- Aguinaldo 1/12.
- Vacaciones por antigüedad (primer año, 1+, 5+, 10+), saldo con aprobadas y pendientes.
- Redondeo a guaraníes enteros.
- Neto negativo detectado para bloquear cierre.

### 11.2 E2E (Playwright)

- Login con `admin` o `rrhh` y acceso a `/rrhh`.
- KPIs y columna de legajo en la tabla de empleados.
- Apertura del modal de nuevo empleado.
- Pantalla de reloj con campos CI y PIN.
- Planilla de asistencia y detalle diario.
- Listado de liquidaciones y enlace al recibo.
- Visor PDF.js del recibo.
- Permiso denegado (403) al PDF para el rol `deposito`.
- Smoke existente sigue pasando.

### 11.3 Comandos

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## 12. Criterios de aceptación

- El usuario `rrhh` inicia sesión y ve el módulo; los roles sin permiso no lo ven.
- Se puede crear y editar un empleado en modal, con legajo visible y PIN hasheado.
- El reloj registra entrada y salida, calcula tardanza, salida anticipada y extras.
- La asistencia mensual muestra y permite corregir marcas.
- La liquidación mensual calcula correctamente sueldo, jornal, destajo y mixto, con extras, tardanzas, ausencias, vacaciones e IPS.
- El aguinaldo calcula 1/12 de lo ganado en el año.
- Las vacaciones tienen saldo, solicitud, aprobación y rechazo.
- El pago de una liquidación genera el gasto y, si corresponde, el movimiento de caja.
- El recibo PDF se ve en la app y se descarga, con leyenda DEMO.
- El seed deja datos coherentes y reproducibles.
- Se actualiza `AGENTS.md` con el módulo RRHH, rutas, usuario demo y comandos de verificación.
- Pasan lint, tests unitarios, build y E2E.

## 13. Riesgos y decisiones

- **Reglas legales simplificadas:** IPS, aguinaldo, vacaciones y recargos se implementan para demo; no reemplazan asesoría laboral.
- **Un período mensual por mes:** no se soportan liquidaciones parciales ni complementarias en esta etapa.
- **Asistencia diaria única:** una entrada y una salida por día; no se soportan turnos partidos ni nocturnos.
- **Vacaciones por año calendario:** el saldo se calcula por año calendario, no por aniversario.
- **Aguinaldo provisorio:** si se genera antes de diciembre, queda rotulado como provisorio y se puede recalcular.
- **PIN compartido:** el kiosco usa PIN de 4 dígitos; para producción real se recomienda hardware o autenticación más fuerte.
- **Pago desde caja:** impacta la caja abierta; si no hay caja abierta, el pago desde efectivo se rechaza.
- **Sin feriados:** las horas en días no laborales se pagan al 100%, pero no se modelan feriados específicos.
