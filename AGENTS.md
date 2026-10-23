# Esmar Demo — memoria del proyecto

Sistema de gestión para **Esmar SRL** (Ñemby, Paraguay), demo funcional. Documentos y SIFEN son simulados: **DEMO — SIN VALIDEZ FISCAL**.

## Estado actual

- Etapas 1–11 completas.
- **Demo:** https://esmarlab.duckdns.org (único acceso público; puerto 3100 cerrado)
- **Repo:** https://github.com/cescbz/esmarlab (rama `main`)
- **Infra:** VPS 193.46.243.7; Dokploy proyecto `Esmar Demo`; app `esmar-demo-7tajdw`; PostgreSQL `esmar-db-b3zw5a` solo en red interna.
- **Dominio:** DuckDNS `esmarlab.duckdns.org`, apuntado con la sesión del usuario. El token no está en el repo. Tocar dominios/DNS/Cloudflare solo con autorización explícita.
- **Usuarios demo:** `admin`, `gerencia`, `ventas`, `caja`, `deposito`, `produccion`, `rrhh`; contraseña `demo1234`.
- `AUTH_URL` en Dokploy debe coincidir con el dominio público. Si cambia el dominio, actualizarlo y redeployar.

## Stack

Next.js 14 App Router + TypeScript estricto, Tailwind + shadcn/ui, PostgreSQL 16 + Prisma, Auth.js v5, Zod, react-hook-form, TanStack Table, Recharts, @react-pdf/renderer, qrcode, PDF.js (`pdfjs-dist`), Docker.

Tipografía: **IBM Plex Sans** (UI) e **IBM Plex Mono** (códigos/números). Usar tokens (`primary`, `brand`, `safety`, `muted`, etc.) y componentes de `src/components/ui`; no inputs nativos de fecha (usar `DatePicker`).

## Reglas de producto

- PYG enteros, precios con IVA incluido, formato `formatGs()`.
- Fechas `dd/mm/aaaa`, zona `America/Asuncion`.
- RUC/CI con DV módulo 11; numeración `EEE-PPP-NNNNNNN`; CDC simulado de 44 dígitos.
- Stock y dinero siempre en `prisma.$transaction`.
- Toda tabla muestra el **código en columna propia** (producto, SKU, RUC, número de documento).
- Formularios de alta/edición de **clientes, productos, proveedores, listas de precios y gastos** abren en modal (`FormDialog`). Los documentos multilínea (presupuesto, factura, compra, OP, envío) siguen como página.
- RRHH: fichas de empleado en modal; el reloj marca entrada/salida con CI + PIN; las liquidaciones, vacaciones y aguinaldos se gestionan desde `/rrhh`. Los recibos de sueldo se ven con PDF.js en `/ver/recibo-sueldo/...`.
- Reloj público `/kiosco`: sin login, restringido por IP del local y con foto obligatoria de entrada/salida. Se configura en `/configuracion` → Reloj. Las fotos se ven desde el detalle de asistencia.
- PDFs de presupuesto, KuDE, recibo y arqueo se ven dentro de la app con PDF.js en `/ver/...`; las APIs de descarga siguen en `/api/pdf/...`.
- Empty states, toasts y confirmaciones en toda acción destructiva.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm test                # Vitest: fiscal, IVA, CDC, formato, roles, códigos, RRHH
npm run test:e2e        # Playwright smoke; usar E2E_BASE_URL si no es la demo
npx prisma migrate dev
npx prisma db seed      # resetea datos de negocio, conserva usuarios; carga RRHH demo
docker compose up -d --build
```

## Deploy

- Push a `main` y disparar `application.deploy` en Dokploy (API con `DOKPLOY_API_KEY`).
- El contenedor corre `prisma migrate deploy`; con `SEED_DEMO=true` carga el seed solo si la base está vacía.
- Para resetear la demo en producción: `docker exec <container> npx prisma db seed`.
- Migrar de VPS: `Dockerfile` + `docker-compose.yml`; mover/restaurar PostgreSQL y actualizar `DATABASE_URL` + `AUTH_URL`.

## Mapa

- `prisma/schema.prisma`, `prisma/seed/` (modular).
- `src/app/(app)/` módulos: clientes, productos, proveedores, stock, compras, ventas, facturación, caja, gastos, producción, rrhh, reportes, configuración.
- `src/actions/` server actions; `src/lib/` fiscal, sifen, billing, stock, cash, reports, payroll, PDFs.
- `src/lib/payroll.ts` (jornada, liquidación, aguinaldo, vacaciones), `src/lib/pdf/payroll-receipt-pdf.tsx`.
- `src/app/kiosco/` (reloj público), `src/lib/ip.ts` (allowlist), `src/lib/photo.ts` (validación de fotos), `AttendancePhoto` en Prisma.
- `src/components/pdf/pdf-viewer.tsx` (PDF.js), `src/components/shared/form-dialog.tsx`, `src/components/ui/date-picker.tsx`.

## Tests y CI

- Vitest cubre DV/RUC, IVA incluido, CDC de 44 dígitos, numeración, formato PYG/fechas, total en letras, roles/PDF, códigos internos, jornada, tardanzas, extras, jornal, destajo, mixto, IPS, aguinaldo, vacaciones, allowlist de IP y fotos.
- Playwright (`e2e/smoke.spec.ts`, `e2e/rrhh.spec.ts`, `e2e/kiosco.spec.ts`) verifica login, KPIs, código en columna, modal de cliente, DatePicker, visor PDF.js, permiso 403 de PDF para depósito, panel RRHH, modal de empleado, reloj, recibo de sueldo, configuración del kiosco y estado público.
- GitHub Actions (`.github/workflows/ci.yml`) levanta PostgreSQL 16, migra, seed, unitarios, lint, build y E2E.

## Pendientes / próximos pasos

- Documentos multilínea (presupuesto, factura, compra, OP, envío) siguen como páginas; evaluar modales full-screen si se pide.
- Revisar si se quiere numeración/código visible en PDFs además de la UI.
- Evaluar tests de mutaciones (crear presupuesto/factura/cobro) contra una base de test dedicada.
