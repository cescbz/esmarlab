import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <FileQuestion className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La dirección que buscás no existe o fue movida.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Volver al dashboard</Link>
        </Button>
        <p className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">
          Esmar SRL · Demo — sin validez fiscal
        </p>
      </div>
    </div>
  );
}
