import { describe, expect, it } from "vitest";
import { isValidPhotoDataUrl, MAX_PHOTO_BYTES, photoByteLength } from "@/lib/photo";

const jpeg = `data:image/jpeg;base64,${Buffer.from("foto-demo").toString("base64")}`;
const png = `data:image/png;base64,${Buffer.from("foto-demo").toString("base64")}`;

describe("foto de asistencia", () => {
  it("acepta JPEG y PNG", () => {
    expect(isValidPhotoDataUrl(jpeg)).toBe(true);
    expect(isValidPhotoDataUrl(png)).toBe(true);
  });

  it("rechaza prefijos inválidos", () => {
    expect(isValidPhotoDataUrl("data:text/plain;base64,abc")).toBe(false);
    expect(isValidPhotoDataUrl("foto")).toBe(false);
  });

  it("rechaza una foto mayor a 300 KB", () => {
    const big = `data:image/jpeg;base64,${Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64")}`;
    expect(photoByteLength(big)).toBeGreaterThan(MAX_PHOTO_BYTES);
    expect(isValidPhotoDataUrl(big)).toBe(false);
  });
});
