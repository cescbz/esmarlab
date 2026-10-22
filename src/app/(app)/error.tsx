"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Ocurrió un error inesperado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No pudimos cargar esta pantalla. Podés reintentar o volver al dashboard.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-[10px] text-muted-foreground">Código: {error.digest}</p> : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => (window.location.href = "/")}>Ir al dashboard</Button>
          <Button onClick={reset}><RefreshCw className="mr-1.5 h-4 w-4" />Reintentar</Button>
        </div>
      </div>
    </div>
  );
}
