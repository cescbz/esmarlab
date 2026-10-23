import { describe, expect, it } from "vitest";
import { numeroALetras } from "@/lib/numbers";

describe("total en letras", () => {
  it("convierte importes habituales", () => {
    expect(numeroALetras(0)).toBe("cero guaraníes");
    expect(numeroALetras(1)).toBe("un guaraní");
    expect(numeroALetras(21)).toBe("veintiún guaraníes");
    expect(numeroALetras(1_000_000)).toBe("un millón de guaraníes");
    expect(numeroALetras(2_583_600)).toBe("dos millones quinientos ochenta y tres mil seiscientos guaraníes");
  });
});
