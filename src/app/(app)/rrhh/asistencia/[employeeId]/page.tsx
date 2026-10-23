import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { auth } from "@/auth";
import { canWrite } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatTime, toDateInputValue } from "@/lib/format";
import { currentPeriod, periodRange } from "@/lib/hr";
import { AttendanceCorrectionDialog } from "./attendance-correction-dialog";
import { PhotoDialog } from "./photo-dialog";
import { AttendancePeriodSelector } from "../attendance-period-selector";

export const metadata: Metadata = { title: "Detalle de asistencia" };

function timeValue(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Asuncion",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default async function AttendanceDetailPage({
  params,
  searchParams,
}: {
  params: { employeeId: string };
  searchParams: { mes?: string };
}) {
  const session = await auth();
  const writable = session ? canWrite(session.user.role, "rrhh") : false;
  const employee = await prisma.employee.findUnique({ where: { id: params.employeeId } });
  if (!employee) notFound();
  const fallback = currentPeriod();
  const value = searchParams.mes ?? `${fallback.year}-${String(fallback.month).padStart(2, "0")}`;
  const [year, month] = value.split("-").map(Number);
  const range = periodRange(year, month);
  const records = await prisma.attendance.findMany({
    where: { employeeId: employee.id, date: { gte: range.start, lte: range.end } },
    include: { photos: true },
    orderBy: { date: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={`Asistencia · ${employee.firstName} ${employee.lastName}`}
        description={`${employee.code} · ${range.label} · ${employee.scheduledStart}–${employee.scheduledEnd}`}
        actions={
          <>
            <AttendancePeriodSelector value={value} />
            <Button asChild variant="outline">
              <Link href="/rrhh/asistencia">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Volver
              </Link>
            </Button>
            {writable ? (
              <AttendanceCorrectionDialog
                employeeId={employee.id}
                trigger={
                  <Button>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agregar marca
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />
      <Card className="border-border/80 shadow-none">
        <CardContent className="p-0">
          {records.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sin marcas en el período.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"
                >
                  <div className="w-28 shrink-0 font-medium">{formatDate(record.date)}</div>
                  <div className="w-32 tabular">
                    {record.checkIn ? formatTime(record.checkIn) : "—"} →{" "}
                    {record.checkOut ? formatTime(record.checkOut) : "—"}
                  </div>
                  <div className="w-24 text-muted-foreground">
                    {Math.round(record.workedMinutes / 6) / 10} h
                  </div>
                  <div className="w-32 text-amber-700">
                    {record.lateMinutes ? `${record.lateMinutes} min tarde` : ""}
                  </div>
                  <div className="w-32 text-sky-700">
                    {record.overtimeMinutes ? `${record.overtimeMinutes} min extra` : ""}
                  </div>
                  <div className="w-24 text-muted-foreground">{record.source}</div>
                  <div className="flex gap-1">
                    {record.photos.map((photo) => (
                      <PhotoDialog key={photo.id} photoId={photo.id} type={photo.type} />
                    ))}
                  </div>
                  {writable ? (
                    <AttendanceCorrectionDialog
                      employeeId={employee.id}
                      record={{
                        date: toDateInputValue(record.date),
                        checkIn: timeValue(record.checkIn?.toISOString() ?? null),
                        checkOut: timeValue(record.checkOut?.toISOString() ?? null),
                        notes: record.notes ?? "",
                      }}
                      trigger={
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Corregir
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
