export type AppRole =
  | "ADMIN"
  | "GERENCIA"
  | "VENTAS"
  | "CAJA"
  | "DEPOSITO"
  | "PRODUCCION";

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  GERENCIA: "Gerencia",
  VENTAS: "Ventas",
  CAJA: "Caja",
  DEPOSITO: "Depósito",
  PRODUCCION: "Producción",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  ADMIN: "Acceso total y configuración",
  GERENCIA: "Dashboard y reportes",
  VENTAS: "Clientes, presupuestos y pedidos",
  CAJA: "Caja, cobros y gastos",
  DEPOSITO: "Stock y compras",
  PRODUCCION: "Fichas técnicas y órdenes",
};

export const ALL_ROLES: AppRole[] = [
  "ADMIN",
  "GERENCIA",
  "VENTAS",
  "CAJA",
  "DEPOSITO",
  "PRODUCCION",
];

const ACCESS: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/configuracion", roles: ["ADMIN"] },
  {
    prefix: "/clientes",
    roles: ["GERENCIA", "VENTAS", "CAJA", "ADMIN"],
  },
  {
    prefix: "/presupuestos",
    roles: ["GERENCIA", "VENTAS", "ADMIN"],
  },
  {
    prefix: "/pedidos",
    roles: ["GERENCIA", "VENTAS", "ADMIN"],
  },
  {
    prefix: "/envios",
    roles: ["GERENCIA", "VENTAS", "ADMIN", "DEPOSITO"],
  },
  {
    prefix: "/facturas",
    roles: ["GERENCIA", "VENTAS", "CAJA", "ADMIN"],
  },
  {
    prefix: "/recibos",
    roles: ["GERENCIA", "VENTAS", "CAJA", "ADMIN"],
  },
  {
    prefix: "/caja",
    roles: ["GERENCIA", "CAJA", "ADMIN"],
  },
  {
    prefix: "/gastos",
    roles: ["GERENCIA", "CAJA", "ADMIN"],
  },
  {
    prefix: "/stock",
    roles: ["GERENCIA", "DEPOSITO", "PRODUCCION", "VENTAS", "ADMIN"],
  },
  {
    prefix: "/compras",
    roles: ["GERENCIA", "DEPOSITO", "ADMIN"],
  },
  {
    prefix: "/produccion",
    roles: ["GERENCIA", "PRODUCCION", "ADMIN"],
  },
  {
    prefix: "/productos",
    roles: ["GERENCIA", "VENTAS", "CAJA", "DEPOSITO", "PRODUCCION", "ADMIN"],
  },
  {
    prefix: "/proveedores",
    roles: ["GERENCIA", "DEPOSITO", "ADMIN"],
  },
  {
    prefix: "/depositos",
    roles: ["GERENCIA", "DEPOSITO", "ADMIN"],
  },
  {
    prefix: "/listas-de-precios",
    roles: ["GERENCIA", "VENTAS", "ADMIN"],
  },
  { prefix: "/reportes", roles: ["GERENCIA", "ADMIN"] },
];

export function canAccess(role: AppRole, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (pathname === "/") return true;
  if (pathname.startsWith("/api/pdf")) return true;
  if (pathname.startsWith("/ver/")) return true;

  const entry = ACCESS.find((item) => pathname.startsWith(item.prefix));
  if (entry) return entry.roles.includes(role);

  return false;
}

export type PdfKind = "presupuesto" | "kude" | "recibo" | "arqueo" | "xml";

const PDF_ACCESS: Record<PdfKind, AppRole[]> = {
  presupuesto: ["ADMIN", "GERENCIA", "VENTAS"],
  kude: ["ADMIN", "GERENCIA", "VENTAS", "CAJA"],
  recibo: ["ADMIN", "GERENCIA", "VENTAS", "CAJA"],
  arqueo: ["ADMIN", "GERENCIA", "CAJA"],
  xml: ["ADMIN", "GERENCIA", "VENTAS", "CAJA"],
};

export function canViewPdf(role: AppRole, kind: PdfKind): boolean {
  return PDF_ACCESS[kind].includes(role);
}

export function canWrite(role: AppRole, module: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "GERENCIA") return false;
  switch (module) {
    case "clientes":
      return ["VENTAS", "CAJA"].includes(role);
    case "ventas":
      return role === "VENTAS";
    case "caja":
      return role === "CAJA";
    case "stock":
      return role === "DEPOSITO";
    case "compras":
      return role === "DEPOSITO";
    case "produccion":
      return role === "PRODUCCION";
    case "configuracion":
      return false;
    default:
      return false;
  }
}

export function isAdmin(role: string | undefined): boolean {
  return role === "ADMIN";
}
