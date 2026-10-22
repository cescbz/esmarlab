"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatGs } from "@/lib/format";

export type PaymentRow = {
  paymentMethodId: string;
  amount: number;
};

export function PaymentEditor({
  methods,
  payments,
  onChange,
  total,
}: {
  methods: { id: string; name: string }[];
  payments: PaymentRow[];
  onChange: (payments: PaymentRow[]) => void;
  total: number;
}) {
  const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const difference = total - paid;

  function update(index: number, patch: Partial<PaymentRow>) {
    onChange(payments.map((payment, i) => (i === index ? { ...payment, ...patch } : payment)));
  }

  function add() {
    const used = new Set(payments.map((payment) => payment.paymentMethodId));
    const method = methods.find((item) => !used.has(item.id)) ?? methods[0];
    if (!method) return;
    onChange([...payments, { paymentMethodId: method.id, amount: 0 }]);
  }

  return (
    <div className="space-y-2">
      {payments.map((payment, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={payment.paymentMethodId}
            onValueChange={(value) => update(index, { paymentMethodId: value })}
          >
            <SelectTrigger className="h-9 flex-1 bg-white text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {methods.map((method) => (
                <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={payment.amount}
            onChange={(event) => update(index, { amount: Number(event.target.value) })}
            className="h-9 w-[130px] bg-white text-right text-xs tabular"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(payments.filter((_, i) => i !== index))}
            disabled={payments.length === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
          <Plus className="mr-1 h-3 w-3" />Agregar medio
        </Button>
        <div className="text-right text-[11px]">
          <p className="text-muted-foreground">Total a cobrar: <span className="font-medium text-foreground tabular">{formatGs(total)}</span></p>
          <p className={difference === 0 ? "text-emerald-700" : "text-amber-700"}>
            {difference === 0 ? "Pago completo" : difference > 0 ? `Falta ${formatGs(difference)}` : `Excede ${formatGs(Math.abs(difference))}`}
          </p>
        </div>
      </div>
    </div>
  );
}
