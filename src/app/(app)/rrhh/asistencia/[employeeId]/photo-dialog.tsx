"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PhotoDialog({ photoId, type }: { photoId: string; type: string }) {
  const label = type === "ENTRADA" ? "entrada" : "salida";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          Foto {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foto de {label}</DialogTitle>
        </DialogHeader>
        <div className="relative h-[60vh] w-full">
          <Image
            src={`/api/attendance/photo/${photoId}`}
            alt={`Foto de ${label}`}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
