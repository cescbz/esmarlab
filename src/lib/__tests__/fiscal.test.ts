import { describe, expect, it } from "vitest";
import { buildCdc, calcInvoiceTotals, calcTax, calculateDV, formatDocNumber, isValidRuc } from "@/lib/fiscal";

describe("dígito verificador", () => {
  it("calcula el DV con módulo 11", () => {
    expect(calculateDV("80009735")).toBe(1);
    expect(calculateDV("80000001")).toBe(3);
    expect(calculateDV("1946520")).toBe(3);
  });

  it("valida RUC completos", () => {
    expect(isValidRuc("80009735-1")).toBe(true);
    expect(isValidRuc("80009735-2")).toBe(false);
    expect(isValidRuc("80000001-3")).toBe(true);
  });
});

describe("IVA incluido", () => {
  it("descompone 10%", () => {
    expect(calcTax(110_000, 10)).toEqual({ gravada: 100_000, iva: 10_000, exenta: 0 });
  });

  it("descompone 5%", () => {
    expect(calcTax(105_000, 5)).toEqual({ gravada: 100_000, iva: 5_000, exenta: 0 });
  });

  it("mantiene exentas", () => {
    expect(calcTax(95_000, 0)).toEqual({ gravada: 0, iva: 0, exenta: 95_000 });
  });

  it("suma líneas con distintas tasas", () => {
    const totals = calcInvoiceTotals([
      { total: 110_000, rate: 10 },
      { total: 105_000, rate: 5 },
      { total: 20_000, rate: 0 },
    ]);
    expect(totals.total).toBe(235_000);
    expect(totals.gravada10).toBe(100_000);
    expect(totals.iva10).toBe(10_000);
    expect(totals.gravada5).toBe(100_000);
    expect(totals.iva5).toBe(5_000);
    expect(totals.exenta).toBe(20_000);
  });
});

describe("numeración y CDC", () => {
  it("formatea el número de documento", () => {
    expect(formatDocNumber("1", "2", 123)).toBe("001-002-0000123");
  });

  it("genera un CDC de 44 dígitos con DV válido", () => {
    const cdc = buildCdc({
      tipoDocumento: "01",
      ruc: "80000001",
      dv: "3",
      establecimiento: "001",
      punto: "001",
      numero: 123,
      fecha: new Date("2026-10-23T12:00:00-03:00"),
      codigoSeguridad: "123456789",
    });
    expect(cdc).toHaveLength(44);
    expect(cdc.slice(0, 43)).toMatch(/^\d{43}$/);
    expect(Number(cdc.at(-1))).toBe(calculateDV(cdc.slice(0, 43)));
  });
});
