import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canViewPdf } from "@/lib/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Visor de presupuesto" };

export default async function QuotePdfViewerPage({ params }: { params: { id: string } }) {
  const authSession = await auth();
  if (!authSession?.user || !canViewPdf(authSession.user.role, "presupuesto")) notFound();
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { customer: true },
  });
  if (!quote) notFound();

  const fileUrl = `/api/pdf/presupuesto/${quote.id}`;

  return (
    <div>
      <PageHeader
        className="no-print"
        title={`Presupuesto ${quote.number}`}
        description={`${quote.customer.name} · ${formatDate(quote.date)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/presupuestos/${quote.id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Volver</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={fileUrl} download><Download className="mr-1.5 h-4 w-4" />Descargar PDF</a>
            </Button>
          </>
        }
      />
      <PdfViewer
        fileUrl={fileUrl}
        title={`Presupuesto ${quote.number}`}
        subtitle={`${quote.customer.name} · ${formatDate(quote.date)}`}
      />
    </div>
  );
}
