# Esmar SRL — Sistema de gestión (demo)

Demo funcional de un sistema de gestión para **Esmar SRL** (Ñemby, Paraguay): ventas, producción, stock, caja, facturación electrónica simulada, recibos, gastos y reportes.

**Demo desplegada:** <https://esmarlab.duckdns.org> · fallback <http://193.46.243.7:3100>

> **DEMO — SIN VALIDEZ FISCAL.** La facturación SIFEN, el CDC, el XML y el KuDE son simulaciones. No se conecta con la SET.

## Stack

- Next.js 14 (App Router) + TypeScript estricto
- Tailwind CSS + shadcn/ui + lucide-react
- PostgreSQL 16 + Prisma
- Auth.js (NextAuth v5) con credenciales y sesiones JWT
- Zod, react-hook-form, @tanstack/react-table, recharts
- @react-pdf/renderer + qrcode para presupuestos, KuDE, recibos y arqueos
- PDF.js (Mozilla) para visualizar los PDFs dentro de la app
- IBM Plex Sans / IBM Plex Mono
- Dockerfile multi-stage y docker-compose

## Levantar con Docker

```bash
cp .env.example .env
# editá AUTH_SECRET y POSTGRES_PASSWORD
docker compose up -d --build
```

La app queda en <http://localhost:3100>. El contenedor aplica migraciones y, si la base está vacía, ejecuta el seed automáticamente (`SEED_DEMO=true`).

Para reiniciar la demo con datos limpios (borra datos de negocio, conserva usuarios):

```bash
docker compose exec app npx prisma db seed
```

## Desarrollo local

Requisitos: Node.js 20+ y PostgreSQL 16.

```bash
npm install
cp .env.example .env
# completá DATABASE_URL y AUTH_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abrí <http://localhost:3000>.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `AUTH_SECRET` | Secreto de Auth.js (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_EMPRESA_NOMBRE` | Nombre visible de la empresa |

## Usuarios demo

Todos usan la contraseña **`demo1234`**.

| Usuario | Nombre | Rol |
|---|---|---|
| `admin` | Ana Giménez | Administrador |
| `gerencia` | Roberto Esmar | Gerencia |
| `ventas` | Lucía Benítez | Ventas |
| `caja` | Mabel Ortiz | Caja |
| `deposito` | Hugo Villalba | Depósito |
| `produccion` | Diego Ayala | Producción |

En el login, cada tarjeta de usuario completa las credenciales automáticamente.

## Datos de ejemplo

El seed (`prisma/seed.ts`) es idempotente: limpia los datos de negocio y los vuelve a generar. Incluye:

- 41 clientes (40 empresas/personas + consumidor final), 8 proveedores
- 61 productos y 400 variantes, 3 listas de precios, 4 depósitos
- 600 facturas históricas, 400 recibos, 150 gastos, 12 pedidos activos
- 46 órdenes de producción (40 terminadas, 6 en proceso, 2 atrasadas)
- Caja 1 abierta hoy, Caja 2 cerrada, movimientos y arqueos recientes
- Clientes con saldos vencidos, productos bajo stock mínimo y pedidos parcialmente despachados

## Formularios y tablas

- Los códigos se muestran en columna propia: producto, SKU, RUC y número de documento.
- Clientes, productos, proveedores, listas de precios y gastos se crean/editan en modales.
- Los PDFs se abren con el visor PDF.js en `/ver/...`.

## Recorrido sugerido para la presentación (10 minutos)

1. **Dashboard como `gerencia`**: KPIs, ventas de 12 meses, top de clientes, próximas entregas y facturas vencidas.
2. **Presupuesto para un frigorífico**: `ventas` → Presupuestos → Nuevo. Elegí un cliente con lista “Frigoríficos”, agregá uniformes personalizados con logo y descargá el PDF. Aprobá: se genera el pedido.
3. **Pedido sin stock**: abrí el pedido, “Generar OP”. En Producción → Tablero, iniciá la OP y avanzá etapas (arrastrando la tarjeta o con “Completar etapa”).
4. **Terminar la OP**: al completar la última etapa se ingresa producto terminado y el pedido queda LISTO. Creá un envío parcial, facturá a crédito y descargá el KuDE A4 o ticket con CDC y QR.
5. **Caja 1** (`caja`): venta de mostrador de botas pagando con tarjeta; cobrá una factura con recibo; registrá un gasto y un retiro.
6. **Cierre de caja**: compará esperado vs. contado por medio de pago y descargá el arqueo en PDF.
7. **Reportes**: caja por caja, medios de pago, cuentas por cobrar, libro de ventas IVA y margen por producto. Exportá CSV o imprimí.

## Reglas de negocio implementadas

- Precios cargados con IVA incluido. Liquidación 10% (`total/11`), 5% (`total/21`) y exento.
- RUC/CI con dígito verificador módulo 11, validado en clientes y proveedores.
- Numeración `EEE-PPP-NNNNNNN` independiente por punto de expedición.
- CDC simulado de 44 dígitos con dígito verificador.
- Entrega parcial, facturación parcial y control de cantidades.
- Movimientos de stock y dinero dentro de `prisma.$transaction`.
- Cierre de caja con arqueo por medio de pago y control de doble cierre.
- Cancelación de factura solo dentro de 48 h. Notas de crédito para devoluciones.
- Consumo de materia prima al iniciar OP; ingreso de producto terminado al terminar.

## Despliegue en Dokploy y migración a otro VPS

1. Creá un proyecto y un servicio PostgreSQL 16 en Dokploy.
2. Creá una aplicación de tipo **Dockerfile** apuntando a este repositorio (rama `main`, Dockerfile en la raíz).
3. Configurá las variables de entorno de la aplicación:
   - `DATABASE_URL` con el hostname interno del servicio PostgreSQL de Dokploy.
   - `AUTH_SECRET`
   - `AUTH_URL` con la URL pública de la demo
   - `NEXT_PUBLIC_EMPRESA_NOMBRE=Esmar SRL`
   - `SEED_DEMO=true` (solo carga datos si la base está vacía)
4. Exponé el puerto `3000` (o agregá un dominio en Dokploy).
5. Deploy. El entrypoint ejecuta `prisma migrate deploy` y el seed inicial.

Como el despliegue está basado en `Dockerfile` + `docker-compose.yml`, el mismo código puede moverse a otro VPS con:

```bash
docker compose up -d --build
```

Solo hay que migrar el volumen de PostgreSQL o restaurar un dump y apuntar `DATABASE_URL` al nuevo servidor.

### Backup / restauración

```bash
# backup
docker compose exec db pg_dump -U esmar esmar > esmar-backup.sql
# restore
cat esmar-backup.sql | docker compose exec -T db psql -U esmar esmar
```

## Estructura

```
prisma/                 schema, migraciones y seed modular
src/app/(app)/          pantallas autenticadas
src/app/api/            auth, health y PDFs (presupuesto, KuDE, recibo, arqueo)
src/actions/            server actions por módulo
src/lib/                fiscal, sifen, billing, stock, reportes, PDFs
src/components/         UI, layout, tablas, reportes
```

## Scripts

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm run lint         # ESLint
npm run db:migrate   # prisma migrate dev
npm run db:seed      # datos demo
npm run db:studio    # Prisma Studio
```
