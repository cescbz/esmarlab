import { describe, expect, it } from "vitest";
import { formatInternalCode, nextSequenceFromCodes } from "@/lib/codes";

describe("códigos internos", () => {
  it("formatea con cuatro dígitos", () => {
    expect(formatInternalCode("CLI", 1)).toBe("CLI-0001");
    expect(formatInternalCode("PROV", 245)).toBe("PROV-0245");
  });

  it("calcula el siguiente secuencial", () => {
    expect(nextSequenceFromCodes("CLI", ["CLI-0001", "CLI-0007", null])).toBe(8);
    expect(nextSequenceFromCodes("PROV", [])).toBe(1);
  });
});
