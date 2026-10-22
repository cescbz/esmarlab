"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormDialogProps = {
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  bodyClassName?: string;
};

export function FormDialog({
  title,
  description,
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  className,
  bodyClassName,
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={cn("max-h-[92svh] gap-0 overflow-hidden p-0 sm:max-w-4xl", className)}>
        <DialogHeader className="border-b border-border bg-card px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-1 text-xs">{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn("max-h-[calc(92svh-82px)] overflow-y-auto bg-background p-5 sm:p-6", bodyClassName)}>
          {children(() => setOpen(false))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
