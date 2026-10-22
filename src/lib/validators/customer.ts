import { z } from "zod";
import { isValidRuc } from "@/lib/fiscal";

export const customerSchema = z.object({
  type: z.enum(["PERSONA_FISICA", "PERSONA_JURIDICA"], {
    required_error: "Seleccioná el tipo de cliente.",
  }),
  name: z.string().min(2, "Ingresá la razón social o nombre completo."),
  ruc: z
    .string()
    .min(1, "Ingresá el RUC o CI.")
    .refine((value) => isValidRuc(value), "RUC o CI inválido. Verificá el dígito verificador."),
  address: z.string().optional().default(""),
  city: z.string().min(2, "Ingresá la ciudad."),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email inválido."),
  priceListId: z.string().min(1, "Seleccioná una lista de precios."),
  creditLimit: z.coerce.number().int().min(0, "El límite no puede ser negativo."),
  termDays: z.coerce.number().int().min(0).max(365),
  active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
