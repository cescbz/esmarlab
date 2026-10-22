"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Truck,
  ReceiptText,
  HandCoins,
  Wallet,
  TrendingDown,
  Boxes,
  ArrowLeftRight,
  Repeat2,
  SlidersHorizontal,
  PackagePlus,
  BookOpenCheck,
  Factory,
  KanbanSquare,
  Scissors,
  Shirt,
  Building2,
  Warehouse,
  Tags,
  BarChart3,
  Settings,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronDown,
  CircleUserRound,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, canAccess, type AppRole } from "@/lib/roles";
import { logoutAction } from "@/actions/session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Ventas",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/presupuestos", label: "Presupuestos", icon: FileText },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { href: "/envios", label: "Envíos", icon: Truck },
    ],
  },
  {
    label: "Facturación",
    items: [
      { href: "/facturas", label: "Facturas", icon: ReceiptText },
      { href: "/recibos", label: "Recibos", icon: HandCoins },
    ],
  },
  {
    label: "Caja",
    items: [
      { href: "/caja", label: "Caja", icon: Wallet },
      { href: "/gastos", label: "Gastos", icon: TrendingDown },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/stock", label: "Existencias", icon: Boxes, exact: true },
      { href: "/stock/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/stock/transferencias", label: "Transferencias", icon: Repeat2 },
      { href: "/stock/ajustes", label: "Ajustes", icon: SlidersHorizontal },
      { href: "/compras", label: "Compras", icon: PackagePlus },
    ],
  },
  {
    label: "Producción",
    items: [
      { href: "/produccion/fichas", label: "Fichas técnicas", icon: BookOpenCheck },
      { href: "/produccion/ordenes", label: "Órdenes de producción", icon: Factory },
      { href: "/produccion/tablero", label: "Tablero", icon: KanbanSquare },
      { href: "/produccion/talleres", label: "Talleres", icon: Scissors },
    ],
  },
  {
    label: "Maestros",
    items: [
      { href: "/productos", label: "Productos", icon: Shirt },
      { href: "/proveedores", label: "Proveedores", icon: Building2 },
      { href: "/depositos", label: "Depósitos", icon: Warehouse },
      { href: "/listas-de-precios", label: "Listas de precios", icon: Tags },
    ],
  },
  {
    label: "Análisis",
    items: [{ href: "/reportes", label: "Reportes", icon: BarChart3 }],
  },
  {
    label: "Sistema",
    items: [{ href: "/configuracion", label: "Configuración", icon: Settings }],
  },
];

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/stock/movimientos", title: "Movimientos de stock" },
  { prefix: "/stock/transferencias", title: "Transferencias" },
  { prefix: "/stock/ajustes", title: "Ajustes de inventario" },
  { prefix: "/stock", title: "Existencias" },
  { prefix: "/produccion/fichas", title: "Fichas técnicas" },
  { prefix: "/produccion/ordenes", title: "Órdenes de producción" },
  { prefix: "/produccion/tablero", title: "Tablero de producción" },
  { prefix: "/produccion/talleres", title: "Talleres" },
  { prefix: "/produccion", title: "Producción" },
  { prefix: "/clientes", title: "Clientes" },
  { prefix: "/presupuestos", title: "Presupuestos" },
  { prefix: "/pedidos", title: "Pedidos" },
  { prefix: "/envios", title: "Envíos" },
  { prefix: "/facturas", title: "Facturas" },
  { prefix: "/recibos", title: "Recibos" },
  { prefix: "/caja", title: "Caja" },
  { prefix: "/gastos", title: "Gastos" },
  { prefix: "/compras", title: "Compras" },
  { prefix: "/productos", title: "Productos" },
  { prefix: "/proveedores", title: "Proveedores" },
  { prefix: "/depositos", title: "Depósitos" },
  { prefix: "/listas-de-precios", title: "Listas de precios" },
  { prefix: "/reportes", title: "Reportes" },
  { prefix: "/configuracion", title: "Configuración" },
  { prefix: "/", title: "Dashboard" },
];

function pageTitle(pathname: string): string {
  return TITLES.find((item) => pathname.startsWith(item.prefix))?.title ?? "Esmar";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type SessionUser = {
  name: string;
  username: string;
  role: AppRole;
};

function NavContent({
  role,
  collapsed,
  onNavigate,
  pathname,
}: {
  role: AppRole;
  collapsed: boolean;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => canAccess(role, item.href));
        if (items.length === 0) return null;

        return (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/35">
                {group.label}
              </p>
            ) : (
              <div className="mx-2 mb-2 border-t border-sidebar-border/70" />
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/[0.09] text-white"
                        : "text-sidebar-foreground/65 hover:bg-white/[0.05] hover:text-sidebar-foreground",
                      collapsed && "justify-center px-0 py-2"
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-amber-400" />
                    ) : null}
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center border-b border-sidebar-border/80 px-5",
        collapsed && "justify-center px-2"
      )}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-[#0b2f31]">
          E
          <span className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-amber-500" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-none tracking-wide text-white">
              ESMAR SRL
            </p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.17em] text-sidebar-foreground/40">
              Sistema de gestión
            </p>
          </div>
        ) : null}
      </Link>
    </div>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="shrink-0 border-t border-sidebar-border/80 p-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-2",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />
        {!collapsed ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            Modo demo
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("esmar:sidebar") === "collapsed") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("esmar:sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  const title = pageTitle(pathname);

  return (
    <div className="flex min-h-svh bg-background">
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-svh shrink-0 flex-col bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[64px]" : "w-[236px]"
        )}
      >
        <Brand collapsed={collapsed} />
        <NavContent role={user.role} collapsed={collapsed} pathname={pathname} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-white/90 px-4 backdrop-blur-sm md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] border-0 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <Brand collapsed={false} />
              <div className="flex h-[calc(100svh-64px)] flex-col">
                <NavContent
                  role={user.role}
                  collapsed={false}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
                <SidebarFooter collapsed={false} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden items-center lg:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="mr-1 h-8 w-8 text-muted-foreground"
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Esmar SRL
            </p>
            <h1 className="truncate text-[15px] font-semibold leading-tight text-foreground">
              {title}
            </h1>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Demo · sin validez fiscal
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border/80 bg-white py-1 pl-1 pr-2.5 text-left transition-colors hover:bg-secondary/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[130px] truncate text-xs font-semibold leading-none">
                    {user.name}
                  </p>
                  <p className="mt-1 text-[10px] leading-none text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <CircleUserRound className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 py-1.5 text-xs font-normal text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Rol: {ROLE_LABELS[user.role]}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <button type="submit" className="w-full">
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-7">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>

        <footer className="no-print border-t border-border/60 px-6 py-3 text-[10px] text-muted-foreground">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2">
            <span>Esmar SRL · Ñemby, Paraguay · RUC 80000001-3</span>
            <span className="flex items-center gap-1.5">
              <Badge variant="outline" className="border-amber-500/40 px-1.5 py-0 text-[9px] font-semibold uppercase text-amber-700">
                Demo
              </Badge>
              Documentos sin validez fiscal
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
