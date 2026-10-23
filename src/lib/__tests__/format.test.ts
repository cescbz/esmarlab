import { describe, expect, it } from "vitest";
import { formatDate, formatGs, formatGsCompact, toDateInputValue } from "@/lib/format";

describe("formato paraguayo", () => {
  it("formatea guaraníes enteros", () => {
    expect(formatGs(1_250_000)).toBe("Gs. 1.250.000");
    expect(formatGs(0)).toBe("Gs. 0");
  });

  it("usa formato compacto para KPIs", () => {
    expect(formatGsCompact(675_300_000)).toBe("Gs. 675,3 M");
    expect(formatGsCompact(1_900_000_000)).toBe("Gs. 1,9 mil M");
  });

  it("usa fechas dd/mm/aaaa", () => {
    expect(formatDate(new Date("2026-10-23T15:00:00-03:00"))).toBe("23/10/2026");
  });

  it("convierte a input de fecha en zona Asunción", () => {
    expect(toDateInputValue(new Date("2026-10-24T01:00:00-03:00"))).toBe("2026-10-24");
  });
});
