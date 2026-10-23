import { z } from "zod";
import { isValidRuc } from "@/lib/fiscal";

const timeRegex = /^\d{2}:\d{2}$/;
const optionalAmount = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().int().min(0).nullable()
);

export const employeeSchema = z
  .object({
    firstName: z.string().min(2, "Ingresá el nombre."),
    lastName: z.string().min(2, "Ingresá el apellido."),
    ci: z
      .string()
      .min(1, "Ingresá la CI.")
      .refine((value) => isValidRuc(value), "CI inválida. Verificá el dígito verificador."),
    birthDate: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    email: z
      .string()
      .optional()
      .default("")
      .refine(
        (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        "Email inválido."
      ),
    address: z.string().optional().default(""),
    emergencyContact: z.string().optional().default(""),
    position: z.string().min(2, "Ingresá el cargo."),
    department: z.string().min(2, "Ingresá el departamento."),
    workshopId: z.string().optional().default(""),
    hireDate: z.string().min(1, "Seleccioná la fecha de ingreso."),
    endDate: z.string().optional().default(""),
    status: z.enum(["ACTIVO", "INACTIVO", "LICENCIA"]).default("ACTIVO"),
    payType: z.enum(["MENSUAL", "JORNAL", "DESTAJO", "MIXTO"]),
    monthlySalary: optionalAmount,
    dailyRate: optionalAmount,
    pieceRate: optionalAmount,
    scheduledStart: z.string().regex(timeRegex, "Hora de entrada inválida."),
    scheduledEnd: z.string().regex(timeRegex, "Hora de salida inválida."),
    lunchMinutes: z.coerce.number().int().min(0).max(240),
    lateToleranceMinutes: z.coerce.number().int().min(0).max(120),
    workDays: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1, "Seleccioná al menos un día."),
    pin: z.string().optional().default(""),
    vacationDaysOverride: optionalAmount,
    notes: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.scheduledEnd <= data.scheduledStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledEnd"],
        message: "La salida debe ser posterior a la entrada.",
      });
    }
    if ((data.payType === "MENSUAL" || data.payType === "MIXTO") && !data.monthlySalary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthlySalary"],
        message: "Ingresá el sueldo mensual.",
      });
    }
    if (data.payType === "JORNAL" && !data.dailyRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dailyRate"],
        message: "Ingresá el jornal diario.",
      });
    }
    if ((data.payType === "DESTAJO" || data.payType === "MIXTO") && !data.pieceRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pieceRate"],
        message: "Ingresá la tarifa por unidad.",
      });
    }
    if (data.pin && !/^\d{4}$/.test(data.pin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pin"],
        message: "El PIN debe tener 4 dígitos.",
      });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
