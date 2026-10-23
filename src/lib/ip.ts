export type ClientIpHeaders = {
  forwardedFor?: string | null;
  realIp?: string | null;
  cfConnectingIp?: string | null;
  trustCloudflare?: boolean;
};

export function normalizeIp(value: string): string {
  let ip = value.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  return ip;
}

export function getClientIp(headers: ClientIpHeaders): string {
  const forwarded = headers.forwardedFor
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (forwarded?.length) return normalizeIp(forwarded[forwarded.length - 1]);
  if (headers.realIp) return normalizeIp(headers.realIp);
  if (headers.trustCloudflare && headers.cfConnectingIp) {
    return normalizeIp(headers.cfConnectingIp);
  }
  return "127.0.0.1";
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map(Number);
  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null;
  }
  return (
    (((numbers[0] << 24) >>> 0) +
      (numbers[1] << 16) +
      (numbers[2] << 8) +
      numbers[3]) >>>
    0
  );
}

function ipv4CidrMatch(ip: string, cidr: string): boolean {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isIpAllowed(ip: string, allowedIps: string): boolean {
  const normalized = normalizeIp(ip);
  const entries = allowedIps
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return entries.some((entry) =>
    entry.includes("/") ? ipv4CidrMatch(normalized, entry) : normalizeIp(entry) === normalized
  );
}
