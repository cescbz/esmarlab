"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function InvoiceStatusPoller({ status }: { status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (status !== "PENDIENTE") return;
    const timer = setTimeout(() => router.refresh(), 4000);
    return () => clearTimeout(timer);
  }, [status, router]);
  return null;
}
