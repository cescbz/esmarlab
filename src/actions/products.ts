"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import { productSchema } from "@/lib/validators/product";
import { skuPart } from "@/lib/sku";
import type { ActionResult } from "./customers";

export async function saveProduct(
  values: unknown,
  productId?: string
): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para administrar productos." };
  }

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  const duplicateCombo = data.variants.find(
    (variant, index) =>
      data.variants.findIndex(
        (other) => other.size === variant.size && other.color === variant.color
      ) !== index
  );
  if (duplicateCombo) {
    return { ok: false, error: `La combinación ${duplicateCombo.size} / ${duplicateCombo.color} está repetida.` };
  }

  const duplicateCode = await prisma.product.findFirst({
    where: { code: data.code.toUpperCase(), ...(productId ? { id: { not: productId } } : {}) },
    select: { name: true },
  });
  if (duplicateCode) {
    return { ok: false, error: `El código ya está usado por ${duplicateCode.name}.` };
  }

  const variantPayloads = data.variants.map((variant) => ({
    id: variant.id,
    size: variant.size.trim(),
    color: variant.color.trim(),
    sku:
      variant.sku?.trim().toUpperCase() ||
      `${data.code.toUpperCase()}-${skuPart(variant.size)}-${skuPart(variant.color)}`,
    priceOverride:
      variant.priceOverride && variant.priceOverride.trim() !== ""
        ? Number(variant.priceOverride)
        : null,
  }));

  for (const variant of variantPayloads) {
    if (variant.priceOverride !== null && (!Number.isFinite(variant.priceOverride) || variant.priceOverride < 0)) {
      return { ok: false, error: `Precio inválido para la variante ${variant.size} / ${variant.color}.` };
    }
  }

  try {
    if (productId) {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: {
            code: data.code.toUpperCase(),
            name: data.name.trim(),
            groupId: data.groupId,
            type: data.type,
            unit: data.unit,
            taxRate: data.taxRate,
            cost: data.cost,
            basePrice: data.basePrice,
            minStock: data.minStock,
            active: data.active,
            hasVariants: variantPayloads.length > 1,
          },
        });
        for (const variant of variantPayloads) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                size: variant.size,
                color: variant.color,
                sku: variant.sku,
                priceOverride: variant.priceOverride,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                size: variant.size,
                color: variant.color,
                sku: variant.sku,
                priceOverride: variant.priceOverride,
              },
            });
          }
        }
      });
      revalidatePath("/productos");
      revalidatePath(`/productos/${productId}`);
      return { ok: true, id: productId };
    }

    const product = await prisma.product.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name.trim(),
        groupId: data.groupId,
        type: data.type,
        unit: data.unit,
        taxRate: data.taxRate,
        cost: data.cost,
        basePrice: data.basePrice,
        minStock: data.minStock,
        active: data.active,
        hasVariants: variantPayloads.length > 1,
        variants: {
          create: variantPayloads.map((variant) => ({
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            priceOverride: variant.priceOverride,
          })),
        },
      },
    });
    const lists = await prisma.priceList.findMany();
    for (const list of lists) {
      const discount = list.name === "Mayorista" ? 12 : list.name === "Frigoríficos" ? 18 : 0;
      const variants = await prisma.productVariant.findMany({ where: { productId: product.id } });
      await prisma.priceListItem.createMany({
        data: variants.map((variant) => ({
          priceListId: list.id,
          variantId: variant.id,
          price: Math.round(data.basePrice * (1 - discount / 100)),
          discountPercent: discount,
        })),
      });
    }
    revalidatePath("/productos");
    return { ok: true, id: product.id };
  } catch {
    return { ok: false, error: "No pudimos guardar el producto. Verificá que el código y los SKU no estén repetidos." };
  }
}

export async function setProductActive(productId: string, active: boolean): Promise<ActionResult> {
  try {
    await requireRole("ADMIN", "DEPOSITO");
  } catch {
    return { ok: false, error: "No tenés permiso para modificar productos." };
  }
  await prisma.product.update({ where: { id: productId }, data: { active } });
  revalidatePath("/productos");
  revalidatePath(`/productos/${productId}`);
  return { ok: true, id: productId };
}
