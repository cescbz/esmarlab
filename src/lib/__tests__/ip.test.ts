import { describe, expect, it } from "vitest";
import { getClientIp, isIpAllowed } from "@/lib/ip";

describe("allowlist de IP", () => {
  it("permite una IP exacta", () => {
    expect(isIpAllowed("190.1.2.3", "190.1.2.3")).toBe(true);
  });

  it("rechaza otra IP", () => {
    expect(isIpAllowed("190.1.2.4", "190.1.2.3")).toBe(false);
  });

  it("permite IPv4 dentro de CIDR", () => {
    expect(isIpAllowed("190.1.2.55", "190.1.2.0/24")).toBe(true);
  });

  it("rechaza IPv4 fuera de CIDR", () => {
    expect(isIpAllowed("190.1.3.55", "190.1.2.0/24")).toBe(false);
  });

  it("ignora espacios y entradas vacías", () => {
    expect(isIpAllowed("190.1.2.3", " , 190.1.2.3 , ")).toBe(true);
  });

  it("normaliza IPv4 mapeada", () => {
    expect(isIpAllowed("::ffff:190.1.2.3", "190.1.2.3")).toBe(true);
  });

  it("normaliza ::1 a 127.0.0.1", () => {
    expect(isIpAllowed("::1", "127.0.0.1")).toBe(true);
  });

  it("lista vacía no permite", () => {
    expect(isIpAllowed("190.1.2.3", "")).toBe(false);
  });

  it("IP inválida no permite en CIDR", () => {
    expect(isIpAllowed("no-es-ip", "190.1.2.0/24")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("toma el último valor de x-forwarded-for", () => {
    expect(getClientIp({ forwardedFor: "1.1.1.1, 190.1.2.3" })).toBe("190.1.2.3");
  });

  it("usa x-real-ip si no hay forwarded", () => {
    expect(getClientIp({ realIp: "190.1.2.3" })).toBe("190.1.2.3");
  });

  it("ignora cf-connecting-ip por defecto", () => {
    expect(getClientIp({ cfConnectingIp: "190.1.2.3" })).toBe("127.0.0.1");
  });

  it("usa cf-connecting-ip con trustCloudflare", () => {
    expect(getClientIp({ cfConnectingIp: "190.1.2.3", trustCloudflare: true })).toBe(
      "190.1.2.3"
    );
  });

  it("fallback local", () => {
    expect(getClientIp({})).toBe("127.0.0.1");
  });
});
