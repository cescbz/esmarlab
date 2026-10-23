"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guards";
import type { ActionResult } from "./customers";

export async function saveKioskSettings(values: unknown): Promise<ActionResult> {
  try {
    await requireRole("ADMIN");
  } catch {
    return { ok: false, error: "Solo administración puede configurar el reloj." };
  }
  const parsed = z
    .object({
      enabled: z.boolean().default(false),
      allowedIps: z.string().optional().default(""),
      requirePhoto: z.boolean().default(true),
      title: z.string().optional().default(""),
    })
    .safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;
  const allowedIps = data.allowedIps
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  await prisma.kioskSettings.upsert({
    where: { id: "default" },
    update: {
      enabled: data.enabled,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
    create: {
      id: "default",
      enabled: data.enabled,
      allowedIps,
      requirePhoto: data.requirePhoto,
      title: data.title || null,
    },
  });
  revalidatePath("/configuracion");
  revalidatePath("/kiosco");
  return { ok: true };
}
