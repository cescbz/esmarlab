"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function KardexFilters({
  products,
}: {
  products: { id: string; name: string; variants: { id: string; sku: string; size: string; color: string }[] }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("producto") ?? "";
  const variantId = searchParams.get("variante") ?? "";
  const product = products.find((item) => item.id === productId);

  function push(nextProduct: string, nextVariant: string) {
    const params = new URLSearchParams();
    if (nextProduct) params.set("producto", nextProduct);
    if (nextVariant) params.set("variante", nextVariant);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={productId} onValueChange={(value) => push(value, "")}>
        <SelectTrigger className="h-9 w-[260px] bg-white text-xs">
          <SelectValue placeholder="Todos los productos" />
        </SelectTrigger>
        <SelectContent>
          {products.map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={variantId || "todas"}
        onValueChange={(value) => push(productId, value === "todas" ? "" : value)}
        disabled={!product}
      >
        <SelectTrigger className="h-9 w-[240px] bg-white text-xs">
          <SelectValue placeholder="Todas las variantes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las variantes</SelectItem>
          {(product?.variants ?? []).map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              {variant.size} · {variant.color}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {productId || variantId ? (
        <button
          type="button"
          onClick={() => router.push("/stock/movimientos")}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
