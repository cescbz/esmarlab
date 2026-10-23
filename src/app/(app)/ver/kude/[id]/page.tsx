import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canViewPdf } from "@/lib/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Visor KuDE" };

export default async function KudeViewerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { formato?: string };
}) {
  const authSession = await auth();
  if (!authSession?.user || !canViewPdf(authSession.user.role, "kude")) notFound();
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true },
  });
  if (!invoice) notFound();

  const formato = searchParams.formato === "ticket" ? "ticket" : "a4";
  const fileUrl = `/api/pdf/kude/${invoice.id}?formato=${formato}`;
  const isNC = invoice.type === "NOTA_CREDITO";

  return (
    <div>
      <PageHeader
        className="no-print"
        title={`${isNC ? "Nota de crédito" : "Factura"} ${invoice.number}`}
        description={`${invoice.customer.name} · ${formatDate(invoice.issueDate)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/facturas/${invoice.id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link>
            </Button>
            <div className="flex overflow-hidden rounded-lg border border-border bg-card">
              <Button asChild variant={formato === "a4" ? "secondary" : "ghost"} className="h-9 rounded-none border-r border-border text-xs">
                <Link href={`/ver/kude/${invoice.id}?formato=a4`}><FileText className="mr-1.5 h-3.5 w-3.5" />A4</Link>
              </Button>
              <Button asChild variant={formato === "ticket" ? "secondary" : "ghost"} className="h-9 rounded-none text-xs">
                <Link href={`/ver/kude/${invoice.id}?formato=ticket`}><FileText className="mr-1.5 h-3.5 w-3.5" />Ticket 80 mm</Link>
              </Button>
            </div>
            <Button asChild variant="outline">
              <a href={fileUrl} download><Download className="mr-1.5 h-4 w-4" />Descargar</a>
            </Button>
          </>
        }
      />
      <PdfViewer
        fileUrl={fileUrl}
        title={`KuDE ${invoice.number}`}
        subtitle={`${invoice.customer.name} · ${formato === "ticket" ? "Ticket 80 mm" : "Formato A4"} · CDC ${invoice.cdc.slice(0, 8)}…`}
      />
    </div>
  );
}
