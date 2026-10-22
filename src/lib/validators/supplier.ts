import { z } from "zod";
import { isValidRuc } from "@/lib/fiscal";

export const supplierSchema = z.object({
  name: z.string().min(2, "Ingresá la razón social."),
  ruc: z
    .string()
    .min(1, "Ingresá el RUC.")
    .refine((value) => isValidRuc(value), "RUC inválido. Verificá el dígito verificador."),
  contactName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .optional()
    .default("")
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email inválido."),
  origin: z.enum(["LOCAL", "IMPORTADO"]),
  active: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
