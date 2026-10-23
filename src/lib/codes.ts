import { prisma } from "@/lib/prisma";

export function formatInternalCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function nextSequenceFromCodes(prefix: string, codes: (string | null | undefined)[]): number {
  let max = 0;
  for (const code of codes) {
    if (!code || !code.startsWith(`${prefix}-`)) continue;
    const value = Number(code.slice(prefix.length + 1));
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return max + 1;
}

export async function nextCustomerCode(): Promise<string> {
  const rows = await prisma.customer.findMany({
    where: { code: { startsWith: "CLI-" } },
    select: { code: true },
  });
  return formatInternalCode("CLI", nextSequenceFromCodes("CLI", rows.map((row) => row.code)));
}

export async function nextSupplierCode(): Promise<string> {
  const rows = await prisma.supplier.findMany({
    where: { code: { startsWith: "PROV-" } },
    select: { code: true },
  });
  return formatInternalCode("PROV", nextSequenceFromCodes("PROV", rows.map((row) => row.code)));
}
