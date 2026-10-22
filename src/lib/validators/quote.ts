import { z } from "zod";

export const quoteLineSchema = z.object({
  variantId: z.string().min(1, "Seleccioná una variante."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero."),
  unitPrice: z.coerce.number().int().min(0, "El precio no puede ser negativo."),
  discountPercent: z.coerce.number().int().min(0).max(100).default(0),
  isCustomized: z.boolean().default(false),
  customizationDetail: z.string().optional().default(""),
});

export const quoteSchema = z.object({
  customerId: z.string().min(1, "Seleccioná un cliente."),
  date: z.string().min(1, "Seleccioná la fecha."),
  validityDays: z.coerce.number().int().min(1).max(120),
  observations: z.string().optional().default(""),
  lines: z.array(quoteLineSchema).min(1, "Agregá al menos una línea."),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;
