import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, "Ingresá el talle."),
  color: z.string().min(1, "Ingresá el color."),
  sku: z.string().optional().default(""),
  priceOverride: z.string().optional().default(""),
});

export const productSchema = z.object({
  code: z
    .string()
    .min(2, "Ingresá el código.")
    .regex(/^[A-Za-z0-9-]+$/, "El código solo admite letras, números y guiones."),
  name: z.string().min(2, "Ingresá el nombre del producto."),
  groupId: z.string().min(1, "Seleccioná un grupo."),
  type: z.enum(["FABRICADO", "REVENTA_LOCAL", "REVENTA_IMPORTADO", "MATERIA_PRIMA"]),
  unit: z.enum(["UN", "PAR", "DOC", "MT", "KG"]),
  taxRate: z.coerce.number().refine((value) => [0, 5, 10].includes(value), "Tasa de IVA inválida."),
  cost: z.coerce.number().int().min(0, "El costo no puede ser negativo."),
  basePrice: z.coerce.number().int().min(0, "El precio no puede ser negativo."),
  minStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo."),
  active: z.boolean().default(true),
  variants: z.array(productVariantSchema).min(1, "Agregá al menos una variante."),
});

export type ProductFormValues = z.infer<typeof productSchema>;
