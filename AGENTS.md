# Esmar Demo — memoria del proyecto

Sistema de gestión para **Esmar SRL** (Ñemby, Paraguay), demo funcional. Documentos y SIFEN son simulados: **DEMO — SIN VALIDEZ FISCAL**.

## Estado actual

- Etapas 1–10 completas.
- **Demo:** https://esmarlab.duckdns.org
- **Fallback por IP:** http://193.46.243.7:3100
- **Repo:** https://github.com/cescbz/esmarlab (rama `main`)
- **Infra:** VPS 193.46.243.7; Dokploy proyecto `Esmar Demo`; app `esmar-demo-7tajdw`; PostgreSQL `esmar-db-b3zw5a` solo en red interna.
- **Dominio:** DuckDNS `esmarlab.duckdns.org`, apuntado con la sesión del usuario. El token no está en el repo. Tocar dominios/DNS/Cloudflare solo con autorización explícita.
- **Usuarios demo:** `admin`, `gerencia`, `ventas`, `caja`, `deposito`, `produccion`; contraseña `demo1234`.
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
- PDFs de presupuesto, KuDE, recibo y arqueo se ven dentro de la app con PDF.js en `/ver/...`; las APIs de descarga siguen en `/api/pdf/...`.
- Empty states, toasts y confirmaciones en toda acción destructiva.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npx prisma migrate dev
npx prisma db seed      # resetea datos de negocio, conserva usuarios
docker compose up -d --build
```

## Deploy

- Push a `main` y disparar `application.deploy` en Dokploy (API con `DOKPLOY_API_KEY`).
- El contenedor corre `prisma migrate deploy`; con `SEED_DEMO=true` carga el seed solo si la base está vacía.
- Para resetear la demo en producción: `docker exec <container> npx prisma db seed`.
- Migrar de VPS: `Dockerfile` + `docker-compose.yml`; mover/restaurar PostgreSQL y actualizar `DATABASE_URL` + `AUTH_URL`.

## Mapa

- `prisma/schema.prisma`, `prisma/seed/` (modular).
- `src/app/(app)/` módulos: clientes, productos, proveedores, stock, compras, ventas, facturación, caja, gastos, producción, reportes, configuración.
- `src/actions/` server actions; `src/lib/` fiscal, sifen, billing, stock, cash, reports, PDFs.
- `src/components/pdf/pdf-viewer.tsx` (PDF.js), `src/components/shared/form-dialog.tsx`, `src/components/ui/date-picker.tsx`.

## Pendientes / próximos pasos

- Tests automatizados (unitarios/e2e) y verificación de flujos críticos.
- KPIs “Ventas de hoy” y “Cobrado hoy” pueden dar 0: el seed no siempre genera movimientos del día. Ajustar seed si se quiere actividad diaria.
- Permisos finos de PDFs: hoy cualquier usuario autenticado puede abrir un documento por ID.
- Evaluar códigos internos `CLI-0001` / `PROV-0001` (hoy clientes/proveedores usan RUC como código).
- Decidir si se cierra el puerto público 3100 al quedar el dominio como acceso principal.
- Documentos multilínea siguen como páginas; evaluar si se quieren modales full-screen.
