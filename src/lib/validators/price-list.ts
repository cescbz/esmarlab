import { z } from "zod";

export const priceListSchema = z.object({
  name: z.string().min(2, "Ingresá el nombre de la lista."),
  description: z.string().optional().default(""),
  discountPercent: z.coerce.number().int().min(0).max(60),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type PriceListFormValues = z.infer<typeof priceListSchema>;
