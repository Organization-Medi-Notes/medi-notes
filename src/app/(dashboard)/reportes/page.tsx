
"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Download, Loader2, TrendingUp, Users } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { appointmentService, medicalRecordService, patientService } from "@/lib/firebase/db-service";

type ReportRow = {
  id: string;
  pacienteId: string;
  fechaMs: number;
  fecha: string;
  paciente: string;
  expediente: string;
  tipoConsulta: string;
  resumenClinico: string;
  estado: string;
};

type AppointmentReportRow = {
  id: string;
  fechaMs: number;
  fecha: string;
  hora: string;
  paciente: string;
  tipoConsulta: string;
  estado: string;
  estadoNormalizado: string;
};

function getFechaMs(fecha: any): number {
  if (!fecha) return 0;
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.getTime();
  } catch {
    return 0;
  }
}

function formatFecha(fecha: any): string {
  if (!fecha) return "—";
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

function toDateInputValue(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isCompletedStatus(estado: unknown): boolean {
  const normalized = String(estado ?? "").trim().toLowerCase();
  return ["completada", "completado", "completed", "finalizada", "finalizado", "atendida", "atendido"].includes(normalized);
}

function normalizarEstadoCita(estado: unknown): string {
  const normalized = String(estado ?? "").trim().toLowerCase();

  if (["completada", "completado", "completed", "finalizada", "finalizado", "realizada", "realizado", "atendida", "atendido"].includes(normalized)) {
    return "realizada";
  }

  if (normalized === "cancelada" || normalized === "cancelado") {
    return "cancelada";
  }

  return "programada";
}

function formatEstadoCita(estado: unknown): string {
  const normalized = normalizarEstadoCita(estado);
  const labels: Record<string, string> = {
    programada: "Programada",
    realizada: "Realizada",
    cancelada: "Cancelada",
  };

  return labels[normalized] ?? "Programada";
}

function formatEstado(estado: unknown): string {
  const normalized = String(estado ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    completada: "Completada",
    completado: "Completado",
    completed: "Completada",
    finalizada: "Finalizada",
    finalizado: "Finalizado",
    atendida: "Atendida",
    atendido: "Atendido",
  };
  return labels[normalized] ?? (normalized || "—");
}

function isWithinRange(fecha: any, start: string, end: string): boolean {
  const dateMs = getFechaMs(fecha);
  if (!dateMs) return false;

  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (!startDate || !endDate) return false;

  const startMs = startDate.getTime();
  const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
  return dateMs >= startMs && dateMs <= endMs;
}

function formatPeriodo(start: string, end: string): string {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (!startDate || !endDate) return "Periodo no definido";

  return `${startDate.toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function getReportFileName(start: string, end: string): string {
  return `reporte-pacientes-atendidos-${start || "inicio"}-a-${end || "fin"}.pdf`;
}

function getAppointmentsReportFileName(start: string, end: string): string {
  return `reporte-citas-${start || "inicio"}-a-${end || "fin"}.pdf`;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentRangeStart, setAppointmentRangeStart] = useState(() => {
    const firstDay = new Date();
    firstDay.setDate(1);
    return toDateInputValue(firstDay);
  });
  const [appointmentRangeEnd, setAppointmentRangeEnd] = useState(() => toDateInputValue(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const firstDay = new Date();
    firstDay.setDate(1);
    return toDateInputValue(firstDay);
  });
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));

  useEffect(() => {
    async function processStats() {
      try {
        const [apts, pats, recs] = await Promise.all([
          appointmentService.getAll(),
          patientService.getAll(),
          medicalRecordService.getAll(),
        ]);

        setAppointments(apts);
        setPatients(pats);
        setRecords(recs);

        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const stats = months.map((month) => ({ name: month, consultas: 0, ingresos: 0 }));

        apts.forEach((appointment: any) => {
          const date = appointment?.fecha?.toDate ? appointment.fecha.toDate() : new Date(appointment.fecha);
          const monthIndex = date.getMonth();

          if (stats[monthIndex]) {
            stats[monthIndex].consultas += 1;
            stats[monthIndex].ingresos += Number(appointment.precio || 0) / 1000000;
          }
        });

        setChartData(stats.filter((stat, index) => stat.consultas > 0 || index <= new Date().getMonth()));
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del reporte.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    processStats();
  }, [toast]);

  const patientById = useMemo(() => new Map(patients.map((patient: any) => [patient.id, patient])), [patients]);
  const recordByCitationId = useMemo(() => {
    const map = new Map<string, any>();

    records.forEach((record: any) => {
      const key = String(record?.cita_id ?? record?.citaId ?? "").trim();
      if (!key || map.has(key)) return;
      map.set(key, record);
    });

    return map;
  }, [records]);

  const reportRows = useMemo<ReportRow[]>(() => {
    return appointments
      .filter((appointment: any) => isCompletedStatus(appointment.estado))
      .filter((appointment: any) => isWithinRange(appointment.fecha, startDate, endDate))
      .map((appointment: any) => {
        const patient = appointment?.paciente_id ? patientById.get(appointment.paciente_id) : null;
        const record = appointment?.id ? recordByCitationId.get(appointment.id) : null;
        const summary = String(
          record?.diagnostico_principal ||
          record?.resumen_ia ||
          record?.motivo_consulta ||
          appointment?.motivo_consulta ||
          appointment?.notas_previas ||
          "—"
        ).trim() || "—";

        return {
          id: String(appointment.id ?? `${appointment?.paciente_nombre ?? "cita"}-${getFechaMs(appointment.fecha)}`),
          pacienteId: String(appointment?.paciente_id ?? patient?.id ?? appointment?.paciente_nombre ?? ""),
          fechaMs: getFechaMs(appointment.fecha),
          fecha: formatFecha(appointment.fecha),
          paciente: patient ? `${patient.nombre ?? ""} ${patient.apellidos ?? ""}`.trim() : String(appointment?.paciente_nombre ?? "—"),
          expediente: patient?.numero_expediente ? String(patient.numero_expediente) : "—",
          tipoConsulta: String(appointment?.tipo_consulta ?? record?.tipo_consulta ?? appointment?.motivo_consulta ?? "—"),
          resumenClinico: summary,
          estado: formatEstado(appointment.estado),
        };
      })
      .sort((a, b) => b.fechaMs - a.fechaMs);
  }, [appointments, endDate, patientById, recordByCitationId, startDate]);

  const uniquePatientCount = useMemo(() => {
    const unique = new Set(reportRows.map((row) => row.pacienteId || row.paciente).filter(Boolean));
    return unique.size;
  }, [reportRows]);

  const appointmentRows = useMemo<AppointmentReportRow[]>(() => {
    return appointments
      .filter((appointment: any) => isWithinRange(appointment.fecha, appointmentRangeStart, appointmentRangeEnd))
      .map((appointment: any) => {
        const patient = appointment?.paciente_id ? patientById.get(appointment.paciente_id) : null;
        const hora = String(appointment?.hora_inicio ?? appointment?.hora ?? "—");
        const estadoNormalizado = normalizarEstadoCita(appointment.estado);

        return {
          id: String(appointment.id ?? `${appointment?.paciente_nombre ?? "cita"}-${getFechaMs(appointment.fecha)}`),
          fechaMs: getFechaMs(appointment.fecha),
          fecha: formatFecha(appointment.fecha),
          hora,
          paciente: patient ? `${patient.nombre ?? ""} ${patient.apellidos ?? ""}`.trim() : String(appointment?.paciente_nombre ?? "—"),
          tipoConsulta: String(appointment?.tipo_consulta ?? appointment?.motivo_consulta ?? "—"),
          estado: formatEstadoCita(appointment.estado),
          estadoNormalizado,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { programada: 0, realizada: 1, cancelada: 2 };
        const byState = order[a.estadoNormalizado] - order[b.estadoNormalizado];
        if (byState !== 0) return byState;
        return b.fechaMs - a.fechaMs;
      });
  }, [appointmentRangeEnd, appointmentRangeStart, appointments, patientById]);

  const appointmentCounts = useMemo(() => {
    return appointmentRows.reduce(
      (acc, row) => {
        acc[row.estadoNormalizado as keyof typeof acc] += 1;
        return acc;
      },
      { programada: 0, realizada: 0, cancelada: 0 }
    );
  }, [appointmentRows]);

  const appointmentRangeInvalid = appointmentRangeStart && appointmentRangeEnd ? appointmentRangeStart > appointmentRangeEnd : false;

  const hasInvalidRange = startDate && endDate ? startDate > endDate : false;

  const handleExportPdf = () => {
    if (hasInvalidRange) {
      toast({
        title: "Rango inválido",
        description: "La fecha inicial no puede ser mayor que la fecha final.",
        variant: "destructive",
      });
      return;
    }

    if (reportRows.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay consultas atendidas en el periodo seleccionado.",
      });
      return;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;

    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de pacientes atendidos", margin, 16);

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Periodo: ${formatPeriodo(startDate, endDate)}`, margin, 22);
    pdf.text(`Total de atenciones: ${reportRows.length}`, margin, 27);
    pdf.text(`Pacientes únicos: ${uniquePatientCount}`, margin, 32);

    autoTable(pdf, {
      startY: 38,
      head: [["Fecha", "Paciente", "Expediente", "Tipo de consulta", "Motivo / resumen clínico", "Estado"]],
      body: reportRows.map((row) => [
        row.fecha,
        row.paciente,
        row.expediente,
        row.tipoConsulta,
        row.resumenClinico,
        row.estado,
      ]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        valign: "top",
        textColor: [51, 65, 85],
      },
      headStyles: {
        fillColor: [45, 106, 159],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 38 },
        2: { cellWidth: 24 },
        3: { cellWidth: 32 },
        4: { cellWidth: 90 },
        5: { cellWidth: 24 },
      },
      margin: { top: 38, left: margin, right: margin, bottom: 16 },
      didDrawPage: (data) => {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 34, pageW - margin, 34);
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8);
        const pageNumber = pdf.getNumberOfPages();
        pdf.text(`Medi Notes · Página ${pageNumber}`, margin, pageH - 8);
        pdf.text(`Generado el ${new Date().toLocaleDateString("es-CR")}`, pageW - margin - 38, pageH - 8);
        data.settings.margin.top = 38;
      },
    });

    pdf.save(getReportFileName(startDate, endDate));

    toast({
      title: "Reporte generado",
      description: "El documento PDF se descargó correctamente.",
    });
  };

  const handleExportAppointmentsPdf = () => {
    if (appointmentRangeInvalid) {
      toast({
        title: "Rango inválido",
        description: "La fecha inicial no puede ser mayor que la fecha final.",
        variant: "destructive",
      });
      return;
    }

    if (appointmentRows.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay citas registradas en el periodo seleccionado.",
      });
      return;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;

    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Reporte de citas", margin, 16);

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Periodo: ${formatPeriodo(appointmentRangeStart, appointmentRangeEnd)}`, margin, 22);
    pdf.text(`Programadas: ${appointmentCounts.programada}`, margin, 27);
    pdf.text(`Realizadas: ${appointmentCounts.realizada}`, margin, 32);
    pdf.text(`Canceladas: ${appointmentCounts.cancelada}`, margin, 37);

    autoTable(pdf, {
      startY: 43,
      head: [["Fecha", "Hora", "Paciente", "Tipo de consulta", "Estado"]],
      body: appointmentRows.map((row) => [row.fecha, row.hora, row.paciente, row.tipoConsulta, row.estado]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        valign: "top",
        textColor: [51, 65, 85],
      },
      headStyles: {
        fillColor: [45, 106, 159],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 24 },
        2: { cellWidth: 60 },
        3: { cellWidth: 70 },
        4: { cellWidth: 30 },
      },
      margin: { top: 43, left: margin, right: margin, bottom: 16 },
      didDrawPage: (data) => {
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 40, pageW - margin, 40);
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8);
        const pageNumber = pdf.getNumberOfPages();
        pdf.text(`Medi Notes · Página ${pageNumber}`, margin, pageH - 8);
        pdf.text(`Generado el ${new Date().toLocaleDateString("es-CR")}`, pageW - margin - 38, pageH - 8);
        data.settings.margin.top = 43;
      },
    });

    pdf.save(getAppointmentsReportFileName(appointmentRangeStart, appointmentRangeEnd));

    toast({
      title: "Reporte generado",
      description: "El documento PDF se descargó correctamente.",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-primary" />
            Reportes y Estadísticas
          </h1>
          <p className="text-gray-500 mt-1">Analice la actividad clínica y genere reportes de pacientes atendidos por periodo.</p>
        </div>
        <Button variant="outline" onClick={handleExportPdf} disabled={loading || hasInvalidRange || reportRows.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card className="card-notion border-none shadow-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Reporte de citas por estado
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha inicial</label>
            <Input type="date" value={appointmentRangeStart} onChange={(event) => setAppointmentRangeStart(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha final</label>
            <Input type="date" value={appointmentRangeEnd} onChange={(event) => setAppointmentRangeEnd(event.target.value)} />
          </div>
          <div className="space-y-2 lg:text-right">
            <p className="text-sm text-gray-500">Periodo seleccionado</p>
            <p className="text-sm font-semibold text-gray-900">{formatPeriodo(appointmentRangeStart, appointmentRangeEnd)}</p>
          </div>
        </CardContent>
        {appointmentRangeInvalid && (
          <div className="px-6 pb-6 text-sm text-rose-600">
            La fecha inicial no puede ser mayor que la fecha final.
          </div>
        )}
        <div className="px-6 pb-6">
          <Button variant="outline" onClick={handleExportAppointmentsPdf} disabled={loading || appointmentRangeInvalid || appointmentRows.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar reporte de citas
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-gray-400">Cargando datos clínicos del periodo...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Programadas</p>
                <p className="text-3xl font-bold text-gray-900">{appointmentCounts.programada}</p>
                <p className="text-sm text-gray-500">Citas agendadas dentro del periodo.</p>
              </CardContent>
            </Card>
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Realizadas</p>
                <p className="text-3xl font-bold text-gray-900">{appointmentCounts.realizada}</p>
                <p className="text-sm text-gray-500">Citas completadas o atendidas.</p>
              </CardContent>
            </Card>
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Canceladas</p>
                <p className="text-3xl font-bold text-gray-900">{appointmentCounts.cancelada}</p>
                <p className="text-sm text-gray-500">Citas canceladas en el periodo.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Listado de citas
              </CardTitle>
              <Badge className="bg-gray-50 text-gray-700 border-gray-100">{appointmentRows.length} registros</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {appointmentRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No hay citas registradas en el periodo seleccionado.</p>
                  <p className="text-sm mt-1">Ajuste las fechas para generar un reporte con datos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow>
                        <TableHead className="font-bold py-4">Fecha</TableHead>
                        <TableHead className="font-bold py-4">Hora</TableHead>
                        <TableHead className="font-bold py-4">Paciente</TableHead>
                        <TableHead className="font-bold py-4">Tipo de consulta</TableHead>
                        <TableHead className="font-bold py-4">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointmentRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-primary-light/30 transition-colors">
                          <TableCell className="font-medium text-gray-700 whitespace-nowrap">{row.fecha}</TableCell>
                          <TableCell className="text-gray-600 whitespace-nowrap">{row.hora}</TableCell>
                          <TableCell className="font-semibold text-gray-900">{row.paciente}</TableCell>
                          <TableCell className="text-gray-600">{row.tipoConsulta}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "capitalize px-2.5 py-0.5 text-[10px] border-transparent",
                                row.estadoNormalizado === "programada" && "bg-amber-50 text-amber-700",
                                row.estadoNormalizado === "realizada" && "bg-emerald-50 text-emerald-700",
                                row.estadoNormalizado === "cancelada" && "bg-rose-50 text-rose-700"
                              )}
                            >
                              {row.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Atenciones reportadas</p>
                <p className="text-3xl font-bold text-gray-900">{reportRows.length}</p>
                <p className="text-sm text-gray-500">Consultas completadas dentro del rango seleccionado.</p>
              </CardContent>
            </Card>
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Pacientes únicos</p>
                <p className="text-3xl font-bold text-gray-900">{uniquePatientCount}</p>
                <p className="text-sm text-gray-500">Pacientes distintos atendidos en el periodo.</p>
              </CardContent>
            </Card>
            <Card className="card-notion border-none shadow-subtle">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Estado del reporte</p>
                <p className="text-3xl font-bold text-gray-900">{reportRows.length > 0 ? "Listo" : "Vacío"}</p>
                <p className="text-sm text-gray-500">{reportRows.length > 0 ? "Puede exportarse en PDF." : "No hay consultas atendidas en este rango."}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
            <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Listado de pacientes atendidos
              </CardTitle>
              <Badge className="bg-gray-50 text-gray-700 border-gray-100">{reportRows.length} registros</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {reportRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No hay consultas atendidas en el periodo seleccionado.</p>
                  <p className="text-sm mt-1">Ajuste las fechas para generar un reporte con datos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow>
                        <TableHead className="font-bold py-4">Fecha</TableHead>
                        <TableHead className="font-bold py-4">Paciente</TableHead>
                        <TableHead className="font-bold py-4">Expediente</TableHead>
                        <TableHead className="font-bold py-4">Tipo de consulta</TableHead>
                        <TableHead className="font-bold py-4">Motivo / resumen clínico</TableHead>
                        <TableHead className="font-bold py-4">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-primary-light/30 transition-colors">
                          <TableCell className="font-medium text-gray-700 whitespace-nowrap">{row.fecha}</TableCell>
                          <TableCell className="font-semibold text-gray-900">{row.paciente}</TableCell>
                          <TableCell className="text-gray-600 whitespace-nowrap">{row.expediente}</TableCell>
                          <TableCell className="text-gray-600">{row.tipoConsulta}</TableCell>
                          <TableCell className="text-gray-600 max-w-[420px]">{row.resumenClinico}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 capitalize px-2.5 py-0.5 text-[10px]">
                              {row.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
              <CardHeader className="p-6 pb-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Consultas por Mes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="consultas" fill="#2D6A9F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
              <CardHeader className="p-6 pb-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Ingresos Mensuales (Millones)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                    <Line type="monotone" dataKey="ingresos" stroke="#6C63FF" strokeWidth={3} dot={{ r: 6, fill: "#6C63FF", strokeWidth: 2, stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
