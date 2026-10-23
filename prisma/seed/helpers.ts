import {
  Prisma,
  ProductType,
  UnitOfMeasure,
  InvoiceCondition,
  SifenStatus,
  InvoiceType,
} from "@prisma/client";

export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(20261022);
export const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
export const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
export const chance = (probability: number) => rand() < probability;
export const money = (value: number) => Math.round(value / 1000) * 1000;

export const now = new Date();

export const daysAgo = (days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, randInt(0, 59), 0, 0);
  return d;
};

export const daysFromNow = (days: number, hour = 12) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

export const startOfMonth = (offset: number) =>
  new Date(now.getFullYear(), now.getMonth() - offset, 1);

export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

export const skuPart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();

let idCounter = 0;
export const id = (prefix: string) => `${prefix}_${++idCounter}`;

export const FAB = ProductType.FABRICADO;
export const REV = ProductType.REVENTA_LOCAL;
export const IMP = ProductType.REVENTA_IMPORTADO;
export const MP = ProductType.MATERIA_PRIMA;

export const CLOTHING = ["S", "M", "L", "XL", "XXL"];
export const PANTS = ["38", "40", "42", "44", "46", "48", "50"];
export const SHOES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
export const ONE = ["ÚNICA"];

export type CatalogItem = {
  name: string;
  group: string;
  type: ProductType;
  unit: UnitOfMeasure;
  taxRate?: number;
  cost: number;
  price: number;
  minStock: number;
  sizes: string[];
  colors: string[];
};

export type VariantInfo = {
  product: CatalogItem;
  productId: string;
  variantId: string;
  sku: string;
};

export type CustomerSeed = {
  id: string;
  code: string;
  type: import("@prisma/client").CustomerType;
  name: string;
  rucBase: string;
  dv: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  priceListId: string;
  creditLimit: number;
  termDays: number;
  active: boolean;
};

export type SupplierSeed = {
  id: string;
  code: string;
  name: string;
  rucBase: string;
  dv: string;
  contactName: string;
  phone: string;
  email: string;
  origin: import("@prisma/client").SupplierOrigin;
  active: boolean;
};

export type PointSeed = {
  id: string;
  establecimiento: string;
  punto: string;
  name: string;
};

export type InvoiceLineDraft = {
  variant: Prisma.ProductVariantCreateManyInput;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  customized: boolean;
};

export type InvoiceDraft = {
  id: string;
  point: string;
  customer: CustomerSeed;
  date: Date;
  condition: InvoiceCondition;
  termDays: number;
  status: SifenStatus;
  lines: InvoiceLineDraft[];
};

export type InvoiceRecord = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  condition: InvoiceCondition;
  issueDate: Date;
  dueDate: Date;
  point: string;
  total: number;
  paidAmount: number;
  balance: number;
};

export type SessionSeed = {
  id: string;
  cashRegisterId: string;
  userId: string | null;
  openedAt: Date;
  openingAmount: number;
  closedAt: Date | null;
  countedAmount: number | null;
  difference: number | null;
  status: import("@prisma/client").CashSessionStatus;
};

export type XmlInput = {
  number: string;
  cdc: string;
  timbrado: string;
  company: { razonSocial: string; ruc: string; dv: string };
  customer: { name: string; rucBase: string; dv: string };
  issueDate: Date;
  total: number;
  subtotal10: number;
  iva10: number;
  subtotal5: number;
  iva5: number;
  exenta: number;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxRate: number;
  }[];
  type: InvoiceType;
};
