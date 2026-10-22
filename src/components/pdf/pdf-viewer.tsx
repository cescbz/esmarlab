"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileWarning,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type PdfViewerProps = {
  fileUrl: string;
  downloadUrl?: string;
  title?: string;
  subtitle?: string;
};

export function PdfViewer({ fileUrl, downloadUrl, title, subtitle }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [autoFit, setAutoFit] = useState(true);

  useEffect(() => {
    let active = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    setLoading(true);
    setError("");
    setDocument(null);
    setPageNumber(1);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loadedDocument = await pdfjs.getDocument({
          url: fileUrl,
          withCredentials: true,
        }).promise;
        if (!active) {
          await loadedDocument.destroy();
          return;
        }
        setDocument(loadedDocument);
        setLoading(false);
      } catch {
        if (active) {
          setError("No pudimos abrir el PDF. Verificá que el documento exista y que tu sesión siga activa.");
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      renderTaskRef.current?.cancel();
      if (loadedDocument) void loadedDocument.destroy();
    };
  }, [fileUrl]);

  const fitWidth = useCallback(async () => {
    if (!document || !containerRef.current) return;
    const page = await document.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const available = Math.max(240, containerRef.current.clientWidth - 48);
    setScale(Math.min(1.8, Math.max(0.35, available / base.width)));
    setAutoFit(true);
  }, [document, pageNumber]);

  useEffect(() => {
    if (!document) return;
    const observer = new ResizeObserver(() => {
      if (autoFit) void fitWidth();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [document, autoFit, fitWidth]);

  useEffect(() => {
    if (!document) return;
    if (autoFit) {
      void fitWidth();
    }
  }, [document, autoFit, fitWidth]);

  useEffect(() => {
    let cancelled = false;
    if (!document || !canvasRef.current) return;
    setRendering(true);

    (async () => {
      try {
        renderTaskRef.current?.cancel();
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const task = page.render({
          canvasContext: context,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (renderError) {
        if (cancelled) return;
        const name = (renderError as { name?: string })?.name;
        if (name !== "RenderingCancelledException") {
          setError("No pudimos renderizar esta página del PDF.");
        }
        setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [document, pageNumber, scale]);

  function changeScale(next: number) {
    setAutoFit(false);
    setScale((current) => Math.min(3, Math.max(0.3, Number((next ?? current).toFixed(2)))));
  }

  function reset() {
    setPageNumber(1);
    setScale(1.15);
    setAutoFit(true);
  }

  const pages = document?.numPages ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            PDF.js · Mozilla
          </Badge>
          <div className="min-w-0">
            {title ? <p className="truncate text-xs font-semibold text-foreground">{title}</p> : null}
            {subtitle ? <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
              disabled={pageNumber <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-8 min-w-[76px] items-center justify-center border-x border-border px-2 text-[11px] tabular text-muted-foreground">
              {loading ? "—" : `${pageNumber} / ${pages}`}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setPageNumber((page) => Math.min(pages, page + 1))}
              disabled={pageNumber >= pages}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-background">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => changeScale(scale - 0.15)} aria-label="Reducir zoom">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="flex h-8 min-w-[58px] items-center justify-center border-x border-border px-2 text-[11px] tabular text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => changeScale(scale + 0.15)} aria-label="Aumentar zoom">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-[11px]" onClick={() => void fitWidth()} title="Ajustar al ancho">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ajustar</span>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={reset} title="Restablecer vista" aria-label="Restablecer vista">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => containerRef.current?.requestFullscreen?.()}
            title="Pantalla completa"
            aria-label="Pantalla completa"
          >
            <Expand className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.print()} title="Imprimir" aria-label="Imprimir">
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-[11px]">
            <a href={downloadUrl ?? fileUrl} download>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="pdf-viewer-scroll relative max-h-[78svh] min-h-[520px] overflow-auto bg-secondary/50 p-4 sm:p-6">
        {loading ? (
          <div className="mx-auto w-full max-w-[760px] space-y-3">
            <Skeleton className="mx-auto h-[70vh] w-full max-w-[680px] rounded-md bg-card" />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando visor PDF…
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <FileWarning className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-semibold">No se pudo mostrar el PDF</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <a href={downloadUrl ?? fileUrl}>Descargar documento</a>
            </Button>
          </div>
        ) : (
          <div className="relative mx-auto flex w-fit flex-col items-center">
            {rendering ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-background/40">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : null}
            <canvas ref={canvasRef} className="rounded-sm border border-border bg-white shadow-md" />
          </div>
        )}
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2 text-[10px] text-muted-foreground">
        <span>Visor PDF basado en PDF.js de Mozilla · Documento de demostración</span>
        <span className="font-semibold uppercase tracking-wide text-destructive">DEMO — SIN VALIDEZ FISCAL</span>
      </div>
    </div>
  );
}
