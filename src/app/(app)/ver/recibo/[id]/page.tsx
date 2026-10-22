import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Visor de recibo" };

export default async function ReceiptPdfViewerPage({ params }: { params: { id: string } }) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
    include: { customer: true },
  });
  if (!receipt) notFound();

  const fileUrl = `/api/pdf/recibo/${receipt.id}`;

  return (
    <div>
      <PageHeader
        className="no-print"
        title={`Recibo ${receipt.number}`}
        description={`${receipt.customer.name} · ${formatDate(receipt.date)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/recibos/${receipt.id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={fileUrl} download><Download className="mr-1.5 h-4 w-4" />Descargar PDF</a>
            </Button>
          </>
        }
      />
      <PdfViewer fileUrl={fileUrl} title={`Recibo ${receipt.number}`} subtitle={`${receipt.customer.name} · ${formatDate(receipt.date)}`} />
    </div>
  );
}
