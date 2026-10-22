"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productSchema, type ProductFormValues } from "@/lib/validators/product";
import { saveProduct } from "@/actions/products";
import { formatGs } from "@/lib/format";

type ProductForForm = {
  id: string;
  code: string;
  name: string;
  groupId: string;
  type: "FABRICADO" | "REVENTA_LOCAL" | "REVENTA_IMPORTADO" | "MATERIA_PRIMA";
  unit: "UN" | "PAR" | "DOC" | "MT" | "KG";
  taxRate: number;
  cost: number;
  basePrice: number;
  minStock: number;
  active: boolean;
  variants: { id: string; size: string; color: string; sku: string; priceOverride: number | null }[];
};

const TYPE_OPTIONS = [
  { value: "FABRICADO", label: "Fabricado" },
  { value: "REVENTA_LOCAL", label: "Reventa local" },
  { value: "REVENTA_IMPORTADO", label: "Reventa importado" },
  { value: "MATERIA_PRIMA", label: "Materia prima" },
] as const;

export function ProductForm({
  groups,
  product,
  onSaved,
  onCancel,
}: {
  groups: { id: string; name: string }[];
  product?: ProductForForm;
  onSaved?: (id?: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          groupId: product.groupId,
          type: product.type,
          unit: product.unit,
          taxRate: product.taxRate,
          cost: product.cost,
          basePrice: product.basePrice,
          minStock: product.minStock,
          active: product.active,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            priceOverride: variant.priceOverride !== null ? String(variant.priceOverride) : "",
          })),
        }
      : {
          code: "",
          name: "",
          groupId: groups[0]?.id ?? "",
          type: "REVENTA_LOCAL",
          unit: "UN",
          taxRate: 10,
          cost: 0,
          basePrice: 0,
          minStock: 10,
          active: true,
          variants: [{ size: "ÚNICA", color: "—", sku: "", priceOverride: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const basePrice = watch("basePrice");
  const watchedVariants = watch("variants");

  function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      setServerError("");
      const result = await saveProduct(values, product?.id);
      if (!result.ok) {
        setServerError(result.error ?? "No pudimos guardar el producto.");
        toast.error(result.error ?? "No pudimos guardar el producto.");
        return;
      }
      toast.success(product ? "Producto actualizado." : "Producto creado.");
      router.refresh();
      if (onSaved) {
        onSaved(result.id);
        return;
      }
      router.push(`/productos/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-5">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Datos del producto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input id="code" {...register("code")} placeholder="REV-045" className="font-mono uppercase" />
              {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Grupo</Label>
              <Controller
                control={control}
                name="groupId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register("name")} placeholder="Bota punta de acero con cordón" />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad de medida</Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidad</SelectItem>
                      <SelectItem value="PAR">Par</SelectItem>
                      <SelectItem value="DOC">Docena</SelectItem>
                      <SelectItem value="MT">Metro</SelectItem>
                      <SelectItem value="KG">Kilogramo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tasa de IVA</Label>
              <Controller
                control={control}
                name="taxRate"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">IVA 10%</SelectItem>
                      <SelectItem value="5">IVA 5%</SelectItem>
                      <SelectItem value="0">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium">Producto activo</p>
                <p className="text-xs text-muted-foreground">Visible para la venta.</p>
              </div>
              <Controller
                control={control}
                name="active"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/60 px-5 py-3.5">
            <CardTitle className="text-sm font-semibold">Costos y precios</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cost">Costo (Gs.)</Label>
              <Input id="cost" type="number" min={0} {...register("cost", { valueAsNumber: true })} />
              {errors.cost ? <p className="text-xs text-destructive">{errors.cost.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="basePrice">Precio base (Gs.)</Label>
              <Input id="basePrice" type="number" min={0} {...register("basePrice", { valueAsNumber: true })} />
              {errors.basePrice ? <p className="text-xs text-destructive">{errors.basePrice.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minStock">Stock mínimo</Label>
              <Input id="minStock" type="number" min={0} {...register("minStock", { valueAsNumber: true })} />
              {errors.minStock ? <p className="text-xs text-destructive">{errors.minStock.message}</p> : null}
            </div>
            <div className="sm:col-span-3">
              <p className="text-[11px] text-muted-foreground">
                Precio de venta base: <span className="font-medium text-foreground">{formatGs(Number(basePrice) || 0)}</span> · los precios se cargan con IVA incluido.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit border-border/80 shadow-none">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <div>
            <CardTitle className="text-sm font-semibold">Variantes</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Talle × color. Genera un SKU por combinación.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ size: "", color: "", sku: "", priceOverride: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border/70 bg-secondary/20 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Talle / numeración</Label>
                  <Input {...register(`variants.${index}.size`)} placeholder="M / 42 / ÚNICA" className="mt-1 h-8 bg-white text-xs" />
                  {errors.variants?.[index]?.size ? (
                    <p className="mt-1 text-[10px] text-destructive">{errors.variants[index]?.size?.message}</p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Color</Label>
                  <Input {...register(`variants.${index}.color`)} placeholder="Negro" className="mt-1 h-8 bg-white text-xs" />
                  {errors.variants?.[index]?.color ? (
                    <p className="mt-1 text-[10px] text-destructive">{errors.variants[index]?.color?.message}</p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">SKU (opcional)</Label>
                  <Input {...register(`variants.${index}.sku`)} placeholder="Automático" className="mt-1 h-8 bg-white font-mono text-xs uppercase" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Precio propio (opcional)</Label>
                  <div className="mt-1 flex gap-2">
                    <Input {...register(`variants.${index}.priceOverride`)} placeholder="Precio base" className="h-8 bg-white text-xs" />
                    {!watchedVariants[index]?.id ? (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {errors.variants?.message ? <p className="text-xs text-destructive">{errors.variants.message}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            Para eliminar una variante existente con movimientos, primero desactivala desde su ficha.
          </p>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        {serverError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())} disabled={pending}>
            <X className="mr-1.5 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
