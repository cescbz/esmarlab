"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, ReceiptText, ShoppingCart, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { VariantPicker, type PickerProduct } from "@/components/shared/variant-picker";
import { PaymentEditor, type PaymentRow } from "@/components/shared/payment-editor";
import { formatGs } from "@/lib/format";
import { quickSale } from "@/actions/cash";

export type SaleProduct = PickerProduct & {
  productName: string;
  taxRate: number;
  variants: (PickerProduct["variants"][number] & { price: number })[];
};

type CartLine = { variantId: string; quantity: number };

export function QuickSaleForm({
  sessionId,
  products,
  customers,
  methods,
}: {
  sessionId: string;
  products: SaleProduct[];
  customers: { id: string; name: string }[];
  methods: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [customerId, setCustomerId] = useState(customers.find((customer) => customer.id === "cus_final")?.id ?? customers[0]?.id ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([{ paymentMethodId: "pm_EFECTIVO", amount: 0 }]);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);

  const variantMap = useMemo(() => {
    const map = new Map<string, { product: string; sku: string; size: string; color: string; price: number }>();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, {
          product: product.productName,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price: variant.price,
        });
      }
    }
    return map;
  }, [products]);

  const total = cart.reduce(
    (sum, line) => sum + (variantMap.get(line.variantId)?.price ?? 0) * line.quantity,
    0
  );

  useEffect(() => {
    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: total }]);
    }
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  function add() {
    if (!selectedVariantId) {
      toast.error("Seleccioná un producto y una variante.");
      return;
    }
    const existing = cart.find((line) => line.variantId === selectedVariantId);
    if (existing) {
      setCart(cart.map((line) => (line.variantId === selectedVariantId ? { ...line, quantity: line.quantity + 1 } : line)));
    } else {
      setCart([...cart, { variantId: selectedVariantId, quantity: 1 }]);
    }
  }

  function submit() {
    if (cart.length === 0) {
      toast.error("Agregá productos a la venta.");
      return;
    }
    if (payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) !== total) {
      toast.error("La suma de los medios de pago debe coincidir con el total.");
      return;
    }
    startTransition(async () => {
      const result = await quickSale({
        customerId,
        sessionId,
        lines: cart,
        payments,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar la venta.");
        return;
      }
      toast.success("Venta de mostrador registrada.");
      setCart([]);
      setPayments([{ paymentMethodId: "pm_EFECTIVO", amount: 0 }]);
      setLastInvoiceId(result.id ?? null);
      router.refresh();
    });
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="border-b border-border/60 px-5 py-3.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          Venta de mostrador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {lastInvoiceId ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
            <span className="flex items-center gap-2"><ReceiptText className="h-4 w-4" />Factura emitida correctamente.</span>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link href={`/facturas/${lastInvoiceId}`}>Ver factura y KuDE</Link>
            </Button>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3">
          <VariantPicker products={products} value={selectedVariantId} onChange={setSelectedVariantId} />
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={add}>
              <Plus className="mr-1 h-3.5 w-3.5" />Agregar
            </Button>
          </div>
        </div>

        {cart.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Carrito vacío" description="Agregá productos para iniciar la venta." className="py-8" />
        ) : (
          <div className="space-y-2">
            {cart.map((line) => {
              const info = variantMap.get(line.variantId);
              if (!info) return null;
              return (
                <div key={line.variantId} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{info.product}</p>
                    <p className="text-[10px] text-muted-foreground">{info.size} · {info.color} · {info.sku} · {formatGs(info.price)}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) =>
                      setCart(cart.map((item) => item.variantId === line.variantId ? { ...item, quantity: Math.max(1, Number(event.target.value)) } : item))
                    }
                    className="h-8 w-16 bg-white text-center text-xs"
                  />
                  <span className="w-24 text-right text-xs font-medium tabular">{formatGs(info.price * line.quantity)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setCart(cart.filter((item) => item.variantId !== line.variantId))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-border/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold">Medios de pago</p>
            <p className="text-sm font-semibold tabular">{formatGs(total)}</p>
          </div>
          <PaymentEditor methods={methods} payments={payments} onChange={setPayments} total={total} />
        </div>

        <Button onClick={submit} disabled={pending || cart.length === 0 || total <= 0} className="w-full">
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-1.5 h-4 w-4" />}
          Cobrar y emitir factura
        </Button>
      </CardContent>
    </Card>
  );
}
