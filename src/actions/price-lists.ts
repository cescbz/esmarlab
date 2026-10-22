"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { priceListSchema } from "@/lib/validators/price-list";
import type { ActionResult } from "./customers";

export async function savePriceList(values: unknown, listId?: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar listas de precios." };
  }
  const parsed = priceListSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;

  const duplicate = await prisma.priceList.findFirst({
    where: { name: data.name, ...(listId ? { id: { not: listId } } : {}) },
  });
  if (duplicate) return { ok: false, error: "Ya existe una lista con ese nombre." };

  if (data.isDefault) {
    await prisma.priceList.updateMany({ data: { isDefault: false } });
  }

  if (listId) {
    const current = await prisma.priceList.findUnique({ where: { id: listId } });
    if (!current) return { ok: false, error: "La lista ya no existe." };
    await prisma.priceList.update({
      where: { id: listId },
      data: {
        name: data.name,
        description: data.description || null,
        isDefault: data.isDefault,
        active: data.active,
      },
    });
    const items = await prisma.priceListItem.findMany({
      where: { priceListId: listId },
      include: { variant: { include: { product: true } } },
    });
    await prisma.$transaction(
      items.map((item) => {
        const base = item.variant.priceOverride ?? item.variant.product.basePrice;
        return prisma.priceListItem.update({
          where: { id: item.id },
          data: {
            discountPercent: data.discountPercent,
            price: Math.round(base * (1 - data.discountPercent / 100)),
          },
        });
      })
    );
    revalidatePath("/listas-de-precios");
    revalidatePath(`/listas-de-precios/${listId}`);
    return { ok: true, id: listId };
  }

  const list = await prisma.priceList.create({
    data: {
      name: data.name,
      description: data.description || null,
      isDefault: data.isDefault,
      active: data.active,
    },
  });
  const variants = await prisma.productVariant.findMany({
    where: { active: true },
    include: { product: true },
  });
  await prisma.priceListItem.createMany({
    data: variants.map((variant) => ({
      priceListId: list.id,
      variantId: variant.id,
      price: Math.round((variant.priceOverride ?? variant.product.basePrice) * (1 - data.discountPercent / 100)),
      discountPercent: data.discountPercent,
    })),
  });
  revalidatePath("/listas-de-precios");
  return { ok: true, id: list.id };
}

export async function setDefaultPriceList(listId: string): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "VENTAS");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar listas de precios." };
  }
  await prisma.$transaction([
    prisma.priceList.updateMany({ data: { isDefault: false } }),
    prisma.priceList.update({ where: { id: listId }, data: { isDefault: true } }),
  ]);
  revalidatePath("/listas-de-precios");
  revalidatePath(`/listas-de-precios/${listId}`);
  return { ok: true, id: listId };
}
