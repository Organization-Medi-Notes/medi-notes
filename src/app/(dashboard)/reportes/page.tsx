
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
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

type ClinicalExpedienteRow = {
  latestConsulta: any | null;
  consultas: any[];
  patient: any;
  patientId: string;
  patientName: string;
  ultimaConsulta: any;
  totalConsultas: number;
};

type SupportPath = "administrativo" | "clinico";
type ClinicalSubtype = "historia_resumida" | "hoja_evolucion" | "datos";

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

function getSupportDocFileName(suffix: string): string {
  return `documento-apoyo-${suffix}-${new Date().getTime()}.pdf`;
}

function getDateFromAny(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: any): string {
  const date = getDateFromAny(value);
  if (!date) return "—";
  return date.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function getClinicalSubtypeLabel(subtype: ClinicalSubtype): string {
  if (subtype === "historia_resumida") return "Historia clínica resumida";
  if (subtype === "hoja_evolucion") return "Hoja de evolución";
  return "Datos";
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
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
  const [openSupportDocDialog, setOpenSupportDocDialog] = useState(false);
  const [supportPath, setSupportPath] = useState<SupportPath | null>(null);
  const [clinicalSubtype, setClinicalSubtype] = useState<ClinicalSubtype | null>(null);
  const [supportDocError, setSupportDocError] = useState("");
  const [generatingSupportDoc, setGeneratingSupportDoc] = useState(false);

  useEffect(() => {
    async function processStats() {
      try {
        const [apts, pats, recs] = await Promise.all([
          appointmentService.getAll(),
          patientService.getAll(),
          medicalRecordService.getAll(),
        ]);

        const consultasSnap = await getDocs(collection(db, "consultas"));
        const consultasRows = consultasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        setAppointments(apts);
        setPatients(pats);
        setRecords(recs);
        setConsultas(consultasRows);

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

  const clinicalRows = useMemo<ClinicalExpedienteRow[]>(() => {
    const activePatients = patients.filter((patient: any) => patient?.activo !== false);

    return activePatients
      .map((patient: any) => {
        const patientId = String(patient?.id ?? "").trim();
        const patientConsultas = consultas
          .filter((consulta: any) => String(consulta?.pacienteId ?? consulta?.paciente_id ?? "").trim() === patientId)
          .sort((a: any, b: any) => (getDateFromAny(b?.fecha)?.getTime() ?? 0) - (getDateFromAny(a?.fecha)?.getTime() ?? 0));

        const latestConsulta = patientConsultas[0] ?? null;

        return {
          latestConsulta,
          consultas: patientConsultas,
          patient,
          patientId,
          patientName: `${patient?.nombre ?? ""} ${patient?.apellidos ?? ""}`.trim() || String(patient?.nombre_completo ?? "Paciente"),
          ultimaConsulta: latestConsulta?.fecha ?? null,
          totalConsultas: patientConsultas.length,
        };
      })
      .sort((a, b) => (getDateFromAny(b.ultimaConsulta)?.getTime() ?? 0) - (getDateFromAny(a.ultimaConsulta)?.getTime() ?? 0));
  }, [consultas, patients]);

  const canGenerateSupportDoc = useMemo(() => {
    if (!supportPath) return false;
    if (supportPath === "administrativo") return appointmentRows.length > 0;
    return false;
  }, [appointmentRows.length, supportPath]);

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

  const handleOpenSupportDocDialog = () => {
    setOpenSupportDocDialog(true);
    setSupportPath(null);
    setClinicalSubtype(null);
    setSupportDocError("");
  };

  const handleGenerateAdministrativeSupportDoc = (): boolean => {
    if (appointmentRows.length === 0) {
      setSupportDocError("No hay citas para generar el documento administrativo.");
      return false;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 12;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Documento de apoyo administrativo", margin, 16);

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Periodo: ${formatPeriodo(appointmentRangeStart, appointmentRangeEnd)}`, margin, 22);
    pdf.text(`Programadas: ${appointmentCounts.programada}`, margin, 27);
    pdf.text(`Realizadas: ${appointmentCounts.realizada}`, margin, 32);
    pdf.text(`Canceladas: ${appointmentCounts.cancelada}`, margin, 37);

    autoTable(pdf, {
      startY: 43,
      head: [["Fecha", "Hora", "Paciente", "Tipo", "Estado"]],
      body: appointmentRows.map((row) => [row.fecha, row.hora, row.paciente, row.tipoConsulta, row.estado]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [51, 65, 85],
      },
      headStyles: {
        fillColor: [45, 106, 159],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { top: 43, left: margin, right: margin, bottom: 16 },
    });

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Medi Notes · Página ${i} de ${totalPages}`, margin, pageH - 8);
      pdf.text(`Generado el ${new Date().toLocaleDateString("es-CR")}`, pageW - margin - 38, pageH - 8);
    }

    pdf.save(getSupportDocFileName("administrativo"));
    return true;
  };

  const handleExportClinicalRecordDoc = (row: ClinicalExpedienteRow, subtype: ClinicalSubtype): boolean => {
    if (!row) {
      setSupportDocError("No se encontró el expediente seleccionado.");
      return false;
    }

    const patient = row.patient as any;
    const record = row.latestConsulta as any;
    const rowConsultas = row.consultas;
    const patientName = row.patientName;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 16;
    const pageH = pdf.internal.pageSize.getHeight();

    pdf.setTextColor(30, 58, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Documento de apoyo clínico", margin, 18);

    pdf.setTextColor(71, 85, 105);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Paciente: ${patientName}`, margin, 24);
    pdf.text(`Subtipo: ${getClinicalSubtypeLabel(subtype)}`, margin, 29);
    pdf.text(`Generado el: ${new Date().toLocaleDateString("es-CR")}`, margin, 34);

    if (subtype === "historia_resumida") {
      const latestRecordDate = formatDate(record?.fecha) || formatDate(patient?.actualizado_en ?? patient?.creado_en);

      const antecedentesPersonales = String(patient?.antecedentesPersonales ?? patient?.antecedentes_personales ?? "—");
      const antecedentesFamiliares = String(patient?.antecedentesFamiliares ?? patient?.antecedentes_familiares ?? "—");
      const alergias = toStringArray(patient?.alergias);
      const medicamentos = toStringArray(patient?.medicamentosActuales ?? patient?.medicamentos_actuales);

      autoTable(pdf, {
        startY: 42,
        head: [["Sección", "Contenido", "Fecha de registro"]],
        body: [
          ["Antecedentes personales", antecedentesPersonales || "—", latestRecordDate || "—"],
          ["Antecedentes familiares", antecedentesFamiliares || "—", latestRecordDate || "—"],
          ["Alergias", alergias.length > 0 ? alergias.join(", ") : "—", latestRecordDate || "—"],
          ["Medicamentos actuales", medicamentos.length > 0 ? medicamentos.join(", ") : "—", latestRecordDate || "—"],
        ],
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
        headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin, bottom: 16 },
      });
    }

    if (subtype === "hoja_evolucion") {
      const rows = rowConsultas.map((consulta: any) => [
        formatDate(consulta?.fecha),
        String(consulta?.motivoConsulta ?? consulta?.motivo_consulta ?? "—"),
        Array.isArray(consulta?.diagnostico)
          ? consulta.diagnostico.join(", ") || "—"
          : String(consulta?.diagnostico ?? consulta?.diagnostico_principal ?? "—"),
        String(consulta?.tratamiento ?? consulta?.plan_tratamiento ?? "—"),
      ]);

      autoTable(pdf, {
        startY: 42,
        head: [["Fecha", "Consulta", "Diagnóstico", "Tratamiento"]],
        body: rows.length > 0 ? rows : [["—", "Sin consultas registradas", "—", "—"]],
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8.5, textColor: [51, 65, 85] },
        headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin, bottom: 16 },
      });
    }

    if (subtype === "datos") {
      const demographics = [
        ["Nombre", `${patient?.nombre ?? ""} ${patient?.apellidos ?? ""}`.trim() || patientName],
        ["Identificación", String(patient?.cedula ?? "—")],
        ["Edad", patient?.edad ? `${patient.edad} años` : "—"],
        ["Sexo", String(patient?.sexo ?? "—")],
        ["Fecha de nacimiento", formatDate(patient?.fecha_nacimiento ?? patient?.fechaNacimiento)],
        ["Número de expediente", String(patient?.numero_expediente ?? "—")],
      ];

      const contact = [
        ["Teléfono", String(patient?.telefono ?? "—")],
        ["Email", String(patient?.email ?? "—")],
        ["Dirección", String(patient?.direccion ?? "—")],
        ["Contacto emergencia", String(patient?.contactoEmergenciaNombre ?? patient?.contacto_emergencia_nombre ?? "—")],
        ["Tel. emergencia", String(patient?.contactoEmergenciaTelefono ?? patient?.contacto_emergencia_telefono ?? "—")],
      ];

      autoTable(pdf, {
        startY: 42,
        head: [["Datos demográficos", "Valor"]],
        body: demographics,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
        headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin, bottom: 16 },
      });

      const startY = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 8 : 120;

      autoTable(pdf, {
        startY,
        head: [["Contacto", "Valor"]],
        body: contact,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
        headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin, bottom: 16 },
      });
    }

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Medi Notes · Página ${i} de ${totalPages}`, margin, pageH - 8);
    }

    pdf.save(getSupportDocFileName(`${subtype}-${row.patientId || "expediente"}`));
    return true;
  };

  const handleGenerateSupportDocument = () => {
    setSupportDocError("");
    setGeneratingSupportDoc(true);

    try {
      if (!supportPath) {
        setSupportDocError("Seleccione un camino: administrativo o clínico.");
        return;
      }

      let success = false;
      if (supportPath === "administrativo") {
        success = handleGenerateAdministrativeSupportDoc();
      } else {
        setSupportDocError("Seleccione un subtipo y use el botón Exportar de cada expediente.");
        success = false;
      }

      if (success) {
        setOpenSupportDocDialog(false);
      }
    } finally {
      setGeneratingSupportDoc(false);
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenSupportDocDialog}>
            Generar documento de apoyo
          </Button>
        </div>
      </div>

      <Dialog
        open={openSupportDocDialog}
        onOpenChange={(open) => {
          setOpenSupportDocDialog(open);
          if (!open) {
            setSupportPath(null);
            setClinicalSubtype(null);
            setSupportDocError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generar documento de apoyo</DialogTitle>
            <DialogDescription>
              Seleccione el camino administrativo o clínico. En clínico, el reporte se genera por paciente desde expediente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Camino</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={supportPath === "administrativo" ? "default" : "outline"}
                  className={cn("h-auto py-3 text-sm justify-start", supportPath === "administrativo" && "bg-accent hover:bg-accent/90 text-white")}
                  onClick={() => {
                    setSupportPath("administrativo");
                    setSupportDocError("");
                  }}
                >
                  Administrativo
                </Button>
                <Button
                  type="button"
                  variant={supportPath === "clinico" ? "default" : "outline"}
                  className={cn("h-auto py-3 text-sm justify-start", supportPath === "clinico" && "bg-accent hover:bg-accent/90 text-white")}
                  onClick={() => {
                    setSupportPath("clinico");
                    setSupportDocError("");
                  }}
                >
                  Clínico
                </Button>
              </div>
            </div>

            {supportPath === "administrativo" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                Se generará un documento administrativo con citas por estado (programadas, realizadas y canceladas) según el periodo seleccionado en reportes.
              </div>
            )}

            {supportPath === "clinico" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Opciones clínicas</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "historia_resumida" as ClinicalSubtype, label: "Historia clínica resumida" },
                      { id: "hoja_evolucion" as ClinicalSubtype, label: "Hoja de evolución" },
                      { id: "datos" as ClinicalSubtype, label: "Datos" },
                    ].map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={clinicalSubtype === option.id ? "default" : "outline"}
                        className={cn("h-auto py-3 text-xs text-left justify-start", clinicalSubtype === option.id && "bg-accent hover:bg-accent/90 text-white")}
                        onClick={() => {
                          setClinicalSubtype(option.id);
                          setSupportDocError("");
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {clinicalSubtype && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Expedientes disponibles</p>
                    {clinicalRows.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                        No hay expedientes disponibles.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="max-h-72 overflow-auto">
                          <Table>
                            <TableHeader className="bg-gray-50/80">
                              <TableRow>
                                <TableHead className="font-bold py-3">Fecha expediente</TableHead>
                                <TableHead className="font-bold py-3">Paciente</TableHead>
                                <TableHead className="font-bold py-3">
                                  {clinicalSubtype === "historia_resumida"
                                    ? "Resumen"
                                    : clinicalSubtype === "hoja_evolucion"
                                    ? "Consulta / Diagnóstico / Tratamiento"
                                    : "Datos y contacto"}
                                </TableHead>
                                <TableHead className="font-bold py-3 text-right">Acción</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clinicalRows.map((row) => {
                                const record = row.latestConsulta;
                                const patient = row.patient;

                                const resumenHistoria = [
                                  `Antecedentes: ${String(patient?.antecedentesPersonales ?? patient?.antecedentes_personales ?? "—")}`,
                                  `Alergias: ${toStringArray(patient?.alergias).join(", ") || "—"}`,
                                  `Medicamentos: ${toStringArray(patient?.medicamentosActuales ?? patient?.medicamentos_actuales).join(", ") || "—"}`,
                                ].join(" | ");

                                const resumenEvolucion = [
                                  `Consulta: ${String(record?.motivoConsulta ?? record?.motivo_consulta ?? "—")}`,
                                  `Diagnóstico: ${Array.isArray(record?.diagnostico) ? (record.diagnostico.join(", ") || "—") : String(record?.diagnostico ?? "—")}`,
                                  `Tratamiento: ${String(record?.tratamiento ?? record?.plan_tratamiento ?? "—")}`,
                                ].join(" | ");

                                const resumenDatos = [
                                  `Demográficos: ${String(patient?.cedula ?? "—")}, ${patient?.edad ? `${patient.edad} años` : "—"}`,
                                  `Contacto: ${String(patient?.telefono ?? "—")} / ${String(patient?.email ?? "—")}`,
                                ].join(" | ");

                                return (
                                  <TableRow key={String(record?.id ?? `${row.patientId}-${formatDate(row.ultimaConsulta)}`)}>
                                    <TableCell className="text-gray-700 whitespace-nowrap">{formatDate(row.ultimaConsulta)}</TableCell>
                                    <TableCell className="font-semibold text-gray-900">{row.patientName}</TableCell>
                                    <TableCell className="text-gray-600 text-xs leading-5">
                                      {clinicalSubtype === "historia_resumida"
                                        ? resumenHistoria
                                        : clinicalSubtype === "hoja_evolucion"
                                        ? resumenEvolucion
                                        : resumenDatos}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const success = handleExportClinicalRecordDoc(row, clinicalSubtype);
                                          if (success) {
                                            toast({
                                              title: "Documento generado",
                                              description: `Se exportó ${getClinicalSubtypeLabel(clinicalSubtype)} para ${row.patientName}.`,
                                            });
                                          }
                                        }}
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        Exportar
                                      </Button>
                                      <p className="text-[10px] text-gray-400 mt-1">{row.totalConsultas} consultas</p>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {supportDocError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {supportDocError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpenSupportDocDialog(false)}>
                Cancelar
              </Button>
              {supportPath === "administrativo" ? (
                <Button
                  type="button"
                  className="bg-accent hover:bg-accent/90 text-white"
                  onClick={handleGenerateSupportDocument}
                  disabled={!canGenerateSupportDoc || generatingSupportDoc}
                >
                  {generatingSupportDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar PDF administrativo
                    </>
                  )}
                </Button>
              ) : supportPath === "clinico" ? (
                <div className="text-xs text-gray-500 self-center">
                  Use los botones <span className="font-semibold">Exportar</span> de cada expediente.
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
