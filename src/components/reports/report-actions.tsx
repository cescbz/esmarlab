"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number | null>[];
}) {
  function download() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (value: string | number | null) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const content = [
      headers.map(escape).join(";"),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(";")),
    ].join("\n");
    const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} className="no-print">
      <Download className="mr-1.5 h-3.5 w-3.5" />CSV
    </Button>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
      <Printer className="mr-1.5 h-3.5 w-3.5" />Imprimir
    </Button>
  );
}
