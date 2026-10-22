import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Visor de arqueo" };

export default async function ArqueoPdfViewerPage({ params }: { params: { id: string } }) {
  const session = await prisma.cashSession.findUnique({
    where: { id: params.id },
    include: { cashRegister: true },
  });
  if (!session) notFound();

  const fileUrl = `/api/pdf/arqueo/${session.id}`;

  return (
    <div>
      <PageHeader
        title={`Arqueo ${session.cashRegister.name}`}
        description={`${formatDate(session.closedAt ?? session.openedAt)} · ${session.status === "ABIERTA" ? "Caja abierta" : "Caja cerrada"}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/caja"><ArrowLeft className="mr-1.5 h-4 w-4" />Volver a caja</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={fileUrl} download><Download className="mr-1.5 h-4 w-4" />Descargar PDF</a>
            </Button>
          </>
        }
      />
      <PdfViewer fileUrl={fileUrl} title={`Arqueo ${session.cashRegister.name}`} subtitle={formatDate(session.closedAt ?? session.openedAt)} />
    </div>
  );
}
