import { describe, expect, it } from "vitest";
import { canAccess, canViewPdf } from "@/lib/roles";

describe("permisos por rol", () => {
  it("restringe configuración a administración", () => {
    expect(canAccess("ADMIN", "/configuracion")).toBe(true);
    expect(canAccess("GERENCIA", "/configuracion")).toBe(false);
  });

  it("permite caja solo a caja, gerencia y admin", () => {
    expect(canAccess("CAJA", "/caja")).toBe(true);
    expect(canAccess("VENTAS", "/caja")).toBe(false);
  });

  it("limita los PDFs por tipo de documento", () => {
    expect(canViewPdf("VENTAS", "presupuesto")).toBe(true);
    expect(canViewPdf("CAJA", "presupuesto")).toBe(false);
    expect(canViewPdf("CAJA", "kude")).toBe(true);
    expect(canViewPdf("PRODUCCION", "kude")).toBe(false);
    expect(canViewPdf("GERENCIA", "arqueo")).toBe(true);
  });
});
