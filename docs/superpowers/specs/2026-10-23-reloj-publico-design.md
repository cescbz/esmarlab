# Reloj público con IP restringida y foto — Diseño

- **Fecha:** 2026-10-23
- **Estado:** aprobado para implementación
- **Contexto:** demo de Esmar SRL. El reloj público es una herramienta de asistencia, no un documento fiscal.

## 1. Objetivo

Permitir que los empleados marquen entrada y salida desde una página pública, sin login, abierta en una PC o celular del local. La página solo funciona desde la IP pública configurada y pide una foto obligatoria en cada marca.

## 2. Alcance

### 2.1 Página pública `/kiosco`

- Ruta fuera del layout autenticado, sin sidebar ni login.
- `export const dynamic = "force-dynamic"` para que lea siempre la IP y la configuración actual.
- Si el reloj está desactivado o la IP no está permitida, muestra un panel informativo y no el formulario.
- Si está habilitado y la IP coincide:
  - Reloj en vivo.
  - Campo CI con DV.
  - Campo PIN de 4 dígitos.
  - Captura de foto.
  - Botón grande “Marcar entrada / salida”.
- Después de marcar muestra **solo**:
  - Nombre del empleado.
  - Tipo de marca (entrada o salida).
  - Hora.
  - Tardanza u horas extras, si corresponde.
- No muestra la foto ni las marcas de otras personas.

### 2.2 Configuración

Nueva pestaña **Reloj** en `/configuracion`, solo ADMIN:

- Activar/desactivar el kiosco.
- IP o rango permitido (varias entradas separadas por coma).
- Botón “Usar mi IP actual”.
- Título opcional del kiosco.
- Switch “Exigir foto” (por defecto activo; la demo lo deja obligatorio).
- URL pública `/kiosco` con botón “Copiar”.
- Texto de ayuda: la IP es la pública del local/router; los celulares deben estar en la misma red.

### 2.3 Foto

- Obligatoria en entrada y salida.
- Se captura con la cámara del dispositivo (`getUserMedia`) o, si falla, con un input de archivo `accept="image/*"` con `capture="user"`.
- Se comprime en el navegador a JPEG, lado máximo 640 px, calidad 0,7.
- Límite de 300 KB por foto ya comprimida.
- Se guarda asociada a la marca de asistencia.
- RRHH/ADMIN/GERENCIA puede verla desde el detalle de asistencia mediante un visor; la página pública no la muestra.
- **Control de RRHH:** no hay aprobación ni rechazo formal de la marca. RRHH ve las fotos de entrada/salida y, si algo no coincide, corrige la marca desde el detalle de asistencia. La foto queda como evidencia.

### 2.4 Fuera de alcance

- Reconocimiento facial o biometría.
- Token secreto de kiosco o certificado de dispositivo.
- App móvil nativa.
- Fotos en el recibo de sueldo o PDFs.
- Envío de fotos a almacenamiento externo (S3/MinIO).
- Historial público de marcas.

## 3. Flujo de uso

1. ADMIN entra a `/configuracion` → pestaña Reloj.
2. Presiona “Usar mi IP actual”, activa el kiosco y guarda.
3. Abre `/kiosco` en la PC del local o en un celular conectado al mismo Wi-Fi.
4. El empleado ingresa su CI con DV y PIN.
5. Toma la foto y presiona “Marcar entrada / salida”.
6. El sistema valida IP, empleado, PIN, vacaciones, marcas duplicadas y foto.
7. Crea o completa la marca del día y guarda la foto.
8. La pantalla muestra nombre, tipo de marca y hora.
9. RRHH ve la marca y la foto en `/rrhh/asistencia/[employeeId]`.

## 4. Modelo de datos

### 4.1 `KioskSettings`

```prisma
model KioskSettings {
  id           String   @id @default("default")
  enabled      Boolean  @default(false)
  allowedIps   String   @default("")
  requirePhoto Boolean  @default(true)
  title        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- Una sola fila con `id = "default"`.
- `allowedIps`: lista separada por comas. Ejemplo: `190.1.2.3, 190.1.2.0/24`.
- No se trunca en el seed; la configuración del admin sobrevive a los resets de demo.
- Si no existe la fila, el kiosco se considera desactivado.

### 4.2 `AttendancePhoto`

```prisma
enum AttendanceMarkType {
  ENTRADA
  SALIDA
}

model AttendancePhoto {
  id           String             @id @default(cuid())
  attendanceId String
  attendance   Attendance         @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
  type         AttendanceMarkType
  data         String
  mimeType     String             @default("image/jpeg")
  createdAt    DateTime           @default(now())

  @@unique([attendanceId, type])
  @@index([attendanceId])
}
```

- `data` guarda el data URL completo (`data:image/jpeg;base64,...`).
- Se agrega la relación inversa `photos AttendancePhoto[]` en `Attendance`.
- Una foto por tipo de marca: `ENTRADA` y `SALIDA` pueden coexistir para el mismo día.
- Se trunca en el seed antes de `Attendance`.

### 4.3 Migración

- Nueva migración `kiosco_foto`.
- Al aplicar en producción, las tablas nuevas quedan vacías.
- No se requiere reseed para habilitar el kiosco; la configuración se crea al guardar desde `/configuracion`.

## 5. Detección y validación de IP

### 5.1 Obtención de la IP

Helper `src/lib/ip.ts`:

```ts
export function getClientIp(headers: {
  forwardedFor?: string | null;
  realIp?: string | null;
  cfConnectingIp?: string | null;
}): string;
```

Orden:

1. `x-forwarded-for`: tomar el **último** valor no vacío (el proxy más cercano, Traefik), para evitar que un cliente falsifique el primer valor.
2. `x-real-ip`.
3. `cf-connecting-ip` solo si `TRUST_CLOUDFLARE=1`; por defecto se ignora para que no se pueda falsificar desde el cliente.
4. `127.0.0.1` como fallback local.

Se normaliza:
- Quitar espacios.
- Si es IPv4 mapeada (`::ffff:190.1.2.3`), convertir a `190.1.2.3`.
- Si es `::1`, tratar como `127.0.0.1` para pruebas locales.

### 5.2 Allowlist

`isIpAllowed(ip: string, allowedIps: string): boolean`

- Lista separada por comas.
- Entrada exacta: `190.1.2.3`.
- IPv4 CIDR: `190.1.2.0/24`.
- IPv6 exacta: `2001:db8::1`.
- IPv6 CIDR no se implementa en esta etapa; se puede agregar después.
- Ignora entradas vacías o inválidas.
- Si la lista está vacía, no permite ninguna IP.
- Si la IP no es válida, devuelve `false`.

### 5.3 Dónde se valida

- En el render de `/kiosco`: si no está permitida, no se muestra el formulario.
- En la server action `publicClockPunch`: se vuelve a validar antes de escribir.
- En `saveKioskSettings` no se valida la IP contra el cliente; solo se guarda.

### 5.4 Proxy

- En producción la app está detrás de Traefik, que setea `X-Forwarded-For`.
- Si en el futuro se agrega Cloudflare, se usa `CF-Connecting-IP`.
- **Riesgo:** si la app queda expuesta directamente sin proxy, un atacante podría falsificar `X-Forwarded-For`. La demo asume que el proxy es confiable.

## 6. Captura y validación de foto

### 6.1 Cliente

Componente `KioskCamera`:

- Pide permiso con `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })`.
- Muestra video en vivo.
- Botón “Tomar foto”: dibuja el frame en un `<canvas>` y obtiene un JPEG.
- Redimensiona a un lado máximo de 640 px.
- Calidad 0,7.
- Muestra preview y botón “Repetir”.
- Si la cámara no está disponible o el permiso se rechaza, muestra un input de archivo `accept="image/*" capture="user"`.
- El formulario no se envía sin foto.

### 6.2 Servidor

Helper `src/lib/photo.ts`:

```ts
export function isValidPhotoDataUrl(value: unknown): value is string;
export function photoByteLength(value: string): number;
```

Validaciones:

- Debe ser un string.
- Prefijo `data:image/jpeg;base64,` o `data:image/png;base64,`.
- Base64 válido.
- Tamaño decodificado ≤ 300 KB.
- Si `requirePhoto` está activo y no hay foto, rechaza la marca.

## 7. Server actions

### 7.1 `publicClockPunch(values)`

`src/actions/kiosk.ts`, sin `requireRole`:

1. Lee headers y obtiene la IP.
2. Lee `KioskSettings`.
3. Si no existe, está desactivado o la IP no está permitida → error.
4. Valida `{ ci, pin, photo }` con Zod.
5. Busca empleado activo por CI normalizada.
6. Compara PIN con bcrypt.
7. Verifica que no esté de vacaciones hoy.
8. Busca la marca de hoy:
   - Si no existe: crea `checkIn = ahora`, calcula tardanza y deja salida pendiente.
   - Si existe sin salida: completa `checkOut = ahora`, recalcula.
   - Si ya tiene entrada y salida: error “Ya registraste entrada y salida hoy”.
9. Valida y guarda la foto en `AttendancePhoto` dentro de la misma transacción, con `type = ENTRADA` o `SALIDA` según la marca.
10. Devuelve `{ ok, employeeName, mark, time, lateMinutes, overtimeMinutes }`.
11. Revalida `/rrhh/asistencia`, `/rrhh/reloj` y `/rrhh`.

No devuelve la foto ni datos de otros empleados.

### 7.2 `saveKioskSettings(values)`

`src/actions/kiosk.ts`, requiere ADMIN:

- `enabled` boolean.
- `allowedIps` string; normaliza comas y espacios.
- `requirePhoto` boolean.
- `title` string opcional.
- Upsert de la fila `default`.
- Revalida `/configuracion` y `/kiosco`.

### 7.3 Acceso a la foto

`GET /api/attendance/photo/[photoId]`:

- Requiere sesión.
- Permite ADMIN, GERENCIA y RRHH.
- Devuelve la imagen con `Content-Type` y `Cache-Control: private, no-store`.
- 401/403/404 según corresponda.

## 8. Interfaz

### 8.1 `/kiosco`

- Fondo oscuro/brand, reloj grande, sin distracciones.
- Título: “Reloj de asistencia” o el título configurado.
- Estado de red: si la IP no está permitida, muestra un panel con el mensaje y no el formulario.
- Formulario:
  - CI con DV.
  - PIN.
  - Cámara/preview.
  - Botón “Marcar entrada / salida”.
- Resultado:
  - “Entrada registrada” o “Salida registrada”.
  - Nombre completo.
  - Hora.
  - “X min tarde” o “X min extra” si aplica.
  - Botón “Listo” para volver al formulario.
- No muestra foto ni lista de marcas.

### 8.2 `/configuracion` pestaña Reloj

- Card “Reloj público”.
- Switch activo/inactivo.
- Input de IPs con placeholder `190.1.2.3, 190.1.2.0/24`.
- Texto “IP detectada: X” y botón “Usar mi IP actual”.
- Input de título.
- Switch “Exigir foto”.
- URL pública con botón copiar.
- Botón Guardar.
- Nota: los celulares deben estar en la misma red Wi-Fi que la IP configurada.

### 8.3 Detalle de asistencia

- Si la marca tiene foto de entrada o salida, mostrar botones “Ver foto entrada” y “Ver foto salida” según existan.
- Al hacer clic, abrir un diálogo con la imagen y la fecha/hora.
- La imagen se carga desde `/api/attendance/photo/[id]`, no inline en la página.

## 9. Middleware y permisos

- `src/auth.config.ts` debe permitir `/kiosco` sin sesión.
- `/kiosco` no se agrega al menú ni a `ACCESS`.
- `/api/attendance/photo/[id]` sigue requiriendo sesión.
- `/configuracion` sigue siendo solo ADMIN.
- El reloj interno `/rrhh/reloj` se mantiene igual y sigue requiriendo rol ADMIN/RRHH para marcar.

## 10. Seed y datos demo

- `KioskSettings`: no se trunca. Al sembrar, si no existe, crear `{ id: "default", enabled: false, allowedIps: "", requirePhoto: true }`. Si existe, no tocarla.
- `AttendancePhoto`: agregar al `TRUNCATE` antes de `Attendance`.
- No se seedean fotos.
- La configuración queda desactivada hasta que el admin cargue su IP y active el reloj.
- El botón “Usar mi IP actual” permite configurar en un clic desde la PC del local.

## 11. Pruebas

### 11.1 Unitarias

`src/lib/__tests__/ip.test.ts`:

- IP exacta permitida.
- IP exacta no permitida.
- IPv4 dentro de CIDR.
- IPv4 fuera de CIDR.
- Lista con espacios y entradas vacías.
- IPv4 mapeada `::ffff:190.1.2.3`.
- Lista vacía no permite.
- IP inválida no permite.
- `getClientIp` toma el último valor de `x-forwarded-for`, luego `x-real-ip`, luego `127.0.0.1`.
- `getClientIp` ignora `cf-connecting-ip` salvo que `TRUST_CLOUDFLARE=1`.

`src/lib/__tests__/photo.test.ts`:

- Data URL JPEG válido.
- Data URL PNG válido.
- Prefijo inválido.
- Base64 inválido.
- Tamaño mayor a 300 KB.

### 11.2 E2E local

- ADMIN abre `/configuracion`, pestaña Reloj, y ve el formulario.
- `/kiosco` responde con un estado controlado: desactivado, red no autorizada o formulario.
- El flujo completo con cámara/foto se verifica manualmente en local:
  - Guardar `enabled = true` y `allowedIps = 127.0.0.1` o `::1`.
  - Abrir `/kiosco` sin sesión.
  - Marcar con CI/PIN de un empleado y una foto.
  - Ver la foto desde el detalle de asistencia.
  - Restaurar la configuración.

### 11.3 E2E producción

- Verificar que `/kiosco` muestra “reloj desactivado” o bloqueo por IP.
- El admin configura su IP con “Usar mi IP actual” y prueba una marca real desde el local.
- No dejar la allowlist en `0.0.0.0/0`.

## 12. Criterios de aceptación

- `/kiosco` abre sin login solo desde la IP configurada.
- Si la IP no coincide, no se puede marcar.
- La foto es obligatoria y se guarda con la marca.
- La página pública no muestra fotos ni marcas de otros.
- La foto se ve desde el detalle de asistencia con permisos de RRHH/ADMIN/GERENCIA.
- La configuración se guarda desde `/configuracion` y sobrevive al seed.
- El reloj interno sigue funcionando.
- Pasan lint, tests, build y E2E.

## 13. Riesgos y decisiones

- **IP dinámica:** si el local cambia de IP, el admin debe actualizarla. El botón “Usar mi IP actual” lo simplifica.
- **Datos móviles:** un celular con datos móviles no coincide con la IP del local; debe usar el Wi-Fi.
- **Spoofing de headers:** se confía en Traefik/Cloudflare. No exponer la app directamente sin proxy.
- **PIN compartido:** el PIN de 4 dígitos es débil; la foto y la IP son las barreras adicionales. Para producción se recomienda un token de kiosco.
- **Fotos en DB:** se guardan comprimidas; no se usa almacenamiento externo en esta etapa.
- **Privacidad:** las fotos solo se ven desde RRHH; la pantalla pública no las muestra.
- **Cámara:** requiere HTTPS y permiso del navegador. Hay fallback de archivo.
- **Sin reconocimiento facial:** la foto es evidencia, no validación biométrica.
