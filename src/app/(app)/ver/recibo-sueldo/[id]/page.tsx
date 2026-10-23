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

export const metadata: Metadata = { title: "Visor de recibo de sueldo" };

export default async function PayrollReceiptViewerPage({ params }: { params: { id: string } }) {
  const authSession = await auth();
  if (!authSession?.user || !canViewPdf(authSession.user.role, "recibo-sueldo")) notFound();
  const item = await prisma.payrollItem.findUnique({
    where: { id: params.id },
    include: { employee: true, payroll: true },
  });
  if (!item) notFound();

  const fileUrl = `/api/pdf/recibo-sueldo/${item.id}`;
  const name = `${item.employee.firstName} ${item.employee.lastName}`;

  return (
    <div>
      <PageHeader
        className="no-print"
        title={`Recibo ${item.payroll.number}`}
        description={`${name} · ${formatDate(item.payroll.endDate)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/rrhh/liquidaciones/${item.payrollId}`}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={fileUrl} download>
                <Download className="mr-1.5 h-4 w-4" />
                Descargar PDF
              </a>
            </Button>
          </>
        }
      />
      <PdfViewer fileUrl={fileUrl} title={`Recibo ${item.payroll.number}`} subtitle={name} />
    </div>
  );
}
