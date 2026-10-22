"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type PickerProduct = {
  id: string;
  name: string;
  variants: { id: string; sku: string; size: string; color: string }[];
};

export function VariantPicker({
  products,
  value,
  onChange,
}: {
  products: PickerProduct[];
  value: string;
  onChange: (variantId: string) => void;
}) {
  const selectedVariant = useMemo(
    () => products.flatMap((product) => product.variants).find((variant) => variant.id === value),
    [products, value]
  );
  const [productId, setProductId] = useState(() => {
    const product = products.find((item) => item.variants.some((variant) => variant.id === value));
    return product?.id ?? products[0]?.id ?? "";
  });

  useEffect(() => {
    if (!value) return;
    const product = products.find((item) => item.variants.some((variant) => variant.id === value));
    if (product && product.id !== productId) setProductId(product.id);
  }, [value, products, productId]);

  const product = products.find((item) => item.id === productId);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Producto</Label>
        <Select
          value={productId}
          onValueChange={(next) => {
            setProductId(next);
            const first = products.find((item) => item.id === next)?.variants[0];
            if (first) onChange(first.id);
          }}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Seleccionar producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Variante</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Seleccionar variante" />
          </SelectTrigger>
          <SelectContent>
            {(product?.variants ?? []).map((variant) => (
              <SelectItem key={variant.id} value={variant.id}>
                {variant.size} · {variant.color} · {variant.sku}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedVariant ? (
        <p className="text-[11px] text-muted-foreground sm:col-span-2">
          SKU {selectedVariant.sku} · Talle {selectedVariant.size} · {selectedVariant.color}
        </p>
      ) : null}
    </div>
  );
}
