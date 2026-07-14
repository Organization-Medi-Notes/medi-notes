"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users,
  CalendarCheck,
  XCircle,
  DollarSign,
  MoreVertical,
  ChevronRight,
  UserPlus,
  Loader2,
  FileText,
  BarChart3,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Download
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardCalendarPreview } from "@/components/dashboard/DashboardCalendarPreview";
import { PastAppointmentsList } from "@/components/dashboard/PastAppointmentsList";
import { UpcomingAppointmentsList } from "@/components/dashboard/UpcomingAppointmentsList";
import { CancelledAppointmentsList } from "@/components/dashboard/CancelledAppointmentsList";
import { DashboardFinancialAnalysis } from "@/components/dashboard/DashboardFinancialAnalysis";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appointmentService, medicalRecordService, patientService } from "@/lib/firebase/db-service";
import { respuestaFormularioService } from "@/lib/firebase/respuestaFormularioService";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico } from "@/lib/types/formulario.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  CitaFormFiller,
  FormResponseValue
} from "../calendario/components/CitaFormFiller";

type Period = "dia" | "semana" | "mes" | "historico";
type ClinicalSupportSubtype = "historia_resumida" | "hoja_evolucion" | "datos";

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDateFromFirestore(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsedDate = new Date(value);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatLongDate(date: Date) {
  return capitalizeFirst(
    date.toLocaleDateString("es-CR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  );
}

function formatMonthYear(date: Date) {
  return capitalizeFirst(
    date.toLocaleDateString("es-CR", {
      month: "long",
      year: "numeric"
    })
  );
}

function formatShortDate(date: Date) {
  return capitalizeFirst(
    date.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  );
}

function formatActivityDate(date: Date) {
  if (date.getTime() === 0) return "Sin fecha";
  return capitalizeFirst(
    date.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  );
}

function getStartOfWeekMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getEndOfWeekSunday(date: Date) {
  const start = getStartOfWeekMonday(date);
  const result = new Date(start);
  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getWeekRangeLabel(date: Date) {
  return `${formatShortDate(getStartOfWeekMonday(date))} - ${formatShortDate(
    getEndOfWeekSunday(date)
  )}`;
}

function getHistoricalRangeLabel(appointments: any[]) {
  const dates = appointments
    .map((apt) => getDateFromFirestore(apt.fecha))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return "Todo el historial";
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`;
}

function getPeriodTitle(period: Period, referenceDate: Date, appointments: any[]) {
  if (period === "dia") return formatLongDate(referenceDate);
  if (period === "semana") return getWeekRangeLabel(referenceDate);
  if (period === "mes") return formatMonthYear(referenceDate);
  return getHistoricalRangeLabel(appointments);
}

function getPeriodCaption(period: Period) {
  if (period === "dia") return "Actividad registrada para el día seleccionado.";
  if (period === "semana") return "Resumen de lunes a domingo para la semana seleccionada.";
  if (period === "mes") return "Resumen general del mes seleccionado.";
  return "Todas las citas registradas en el sistema.";
}

function getShortPeriodLabel(period: Period) {
  if (period === "dia") return "Día";
  if (period === "semana") return "Semana";
  if (period === "mes") return "Mes";
  return "Histórico";
}

function getMetricScopeLabel(period: Period) {
  if (period === "dia") return "Día seleccionado";
  if (period === "semana") return "Semana seleccionada";
  if (period === "mes") return "Mes seleccionado";
  return "Total histórico";
}

function isDateInPeriod(date: Date | null, period: Period, referenceDate: Date) {
  if (!date) return false;
  if (period === "historico") return true;

  if (period === "dia") {
    return (
      date.getDate() === referenceDate.getDate() &&
      date.getMonth() === referenceDate.getMonth() &&
      date.getFullYear() === referenceDate.getFullYear()
    );
  }

  if (period === "semana") {
    return date >= getStartOfWeekMonday(referenceDate) && date <= getEndOfWeekSunday(referenceDate);
  }

  return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();
}

function moveReferenceDate(date: Date, period: Period, direction: "prev" | "next") {
  const result = new Date(date);
  const amount = direction === "prev" ? -1 : 1;
  if (period === "dia") result.setDate(result.getDate() + amount);
  if (period === "semana") result.setDate(result.getDate() + amount * 7);
  if (period === "mes") result.setMonth(result.getMonth() + amount);
  return result;
}

function getAppointmentPrice(apt: any) {
  const value = apt.precio ?? apt.monto ?? 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsedValue = Number(value.replace(/[^\d.-]/g, ""));
    return isNaN(parsedValue) ? 0 : parsedValue;
  }
  return 0;
}

function getAppointmentStatus(apt: any) {
  return String(apt.estado ?? "pendiente").toLowerCase();
}

function getAppointmentTime(apt: any) {
  return apt.hora_inicio ?? apt.horaInicio ?? apt.hora ?? "Sin hora";
}

function getAppointmentPatientName(apt: any) {
  return apt.paciente_nombre ?? apt.pacienteNombre ?? apt.paciente ?? "Paciente sin nombre";
}

function getAppointmentType(apt: any) {
  return apt.tipo_consulta ?? apt.tipoConsulta ?? apt.tipo ?? "Consulta";
}

function getPatientName(patient: any) {
  return patient.nombre ?? patient.nombre_completo ?? patient.name ?? "Paciente sin nombre";
}

function getMedicalRecordDate(record: any) {
  return getDateFromFirestore(record?.fecha_consulta ?? record?.fechaConsulta ?? record?.creado_en);
}

function getMedicalRecordPatientId(record: any) {
  return String(record?.paciente_id ?? record?.pacienteId ?? "").trim();
}

function getMedicalRecordSummaryDate(record: any): Date | null {
  return getDateFromFirestore(record?.fecha_consulta ?? record?.fechaConsulta ?? record?.actualizado_en ?? record?.creado_en);
}

function formatDateTime(value: any) {
  const date = getDateFromFirestore(value);
  if (!date) return "—";
  return date.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getClinicalSubtypeLabel(subtype: ClinicalSupportSubtype) {
  if (subtype === "historia_resumida") return "Historia clínica resumida";
  if (subtype === "hoja_evolucion") return "Hoja de evolución";
  return "Datos";
}

function toTextArray(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function getStatusLabel(status: string) {
  if (status === "confirmada") return "confirmada";
  if (status === "pendiente") return "pendiente";
  if (status === "cancelada") return "cancelada";
  if (status === "completada" || status === "completado") return "completada";
  if (status === "declinada") return "declinada";
  if (status === "programada") return "programada";
  return status;
}

function getTrendData(period: Period, appointments: any[], referenceDate: Date) {
  if (period === "dia") {
    const buckets = [
      { label: "Mañana", total: 0 },
      { label: "Tarde", total: 0 },
      { label: "Noche", total: 0 },
      { label: "Sin hora", total: 0 }
    ];

    appointments.forEach((apt) => {
      const time = getAppointmentTime(apt);
      const hour = Number(String(time).split(":")[0]);
      if (!time || time === "Sin hora" || isNaN(hour)) buckets[3].total += 1;
      else if (hour < 12) buckets[0].total += 1;
      else if (hour < 18) buckets[1].total += 1;
      else buckets[2].total += 1;
    });

    return buckets;
  }

  if (period === "semana") {
    const weekStart = getStartOfWeekMonday(referenceDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const total = appointments.filter((apt) => {
        const aptDate = getDateFromFirestore(apt.fecha);
        return (
          aptDate &&
          aptDate.getDate() === date.getDate() &&
          aptDate.getMonth() === date.getMonth() &&
          aptDate.getFullYear() === date.getFullYear()
        );
      }).length;
      return { label: date.toLocaleDateString("es-CR", { weekday: "short" }), total };
    });
  }

  if (period === "mes") {
    const buckets = [
      { label: "Sem 1", total: 0 },
      { label: "Sem 2", total: 0 },
      { label: "Sem 3", total: 0 },
      { label: "Sem 4", total: 0 },
      { label: "Sem 5", total: 0 }
    ];

    appointments.forEach((apt) => {
      const aptDate = getDateFromFirestore(apt.fecha);
      if (!aptDate) return;
      const weekIndex = Math.min(Math.floor((aptDate.getDate() - 1) / 7), 4);
      buckets[weekIndex].total += 1;
    });

    return buckets;
  }

  const monthMap = new Map<string, { label: string; total: number; order: number }>();
  appointments.forEach((apt) => {
    const aptDate = getDateFromFirestore(apt.fecha);
    if (!aptDate) return;
    const key = `${aptDate.getFullYear()}-${aptDate.getMonth()}`;
    const label = aptDate.toLocaleDateString("es-CR", { month: "short", year: "2-digit" });
    if (!monthMap.has(key)) {
      monthMap.set(key, { label, total: 0, order: aptDate.getFullYear() * 12 + aptDate.getMonth() });
    }
    const current = monthMap.get(key);
    if (current) current.total += 1;
  });

  return Array.from(monthMap.values())
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ label: item.label, total: item.total }));
}

export default function DashboardPage() {
  const router = useRouter();
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [openAppointmentDetail, setOpenAppointmentDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [assignedForms, setAssignedForms] = useState<any[]>([]);
  const [formsById, setFormsById] = useState<Record<string, FormularioClinico>>({});
  const [loadingAssignedForms, setLoadingAssignedForms] = useState(false);
  const [openFillForm, setOpenFillForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [savingFormResponse, setSavingFormResponse] = useState(false);
  const [openSupportDocDialog, setOpenSupportDocDialog] = useState(false);
  const [supportSubtype, setSupportSubtype] = useState<ClinicalSupportSubtype | null>(null);
  const [selectedSupportPatientId, setSelectedSupportPatientId] = useState("");
  const [supportDocError, setSupportDocError] = useState("");
  const [generatingSupportDoc, setGeneratingSupportDoc] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [allApts, pts, records] = await Promise.all([
          appointmentService.getAll(),
          patientService.getAll(),
          medicalRecordService.getAll()
        ]);
        setAllAppointments(allApts);
        setPatients(pts);
        setMedicalRecords(records);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const periodTitle = getPeriodTitle(period, referenceDate, allAppointments);
  const periodCaption = getPeriodCaption(period);
  const shortPeriodLabel = getShortPeriodLabel(period);
  const metricScopeLabel = getMetricScopeLabel(period);

  const periodAppointments = allAppointments.filter((apt) =>
    isDateInPeriod(getDateFromFirestore(apt.fecha), period, referenceDate)
  );

  const periodMedicalRecords = medicalRecords.filter((record) =>
    isDateInPeriod(getMedicalRecordDate(record), period, referenceDate)
  );

  const periodUniquePatientIds = new Set(
    periodAppointments
      .map((apt) => String(apt?.paciente_id ?? apt?.pacienteId ?? "").trim())
      .filter(Boolean)
  );

  periodMedicalRecords.forEach((record) => {
    const patientId = getMedicalRecordPatientId(record);
    if (patientId) periodUniquePatientIds.add(patientId);
  });

  const operationalSummary = {
    totalCitas: periodAppointments.length,
    citasProgramadas: periodAppointments.filter((apt) => getAppointmentStatus(apt) === "programada").length,
    citasRealizadas: periodAppointments.filter((apt) => {
      const status = getAppointmentStatus(apt);
      return status === "completada" || status === "completado" || status === "confirmada";
    }).length,
    citasCanceladas: periodAppointments.filter((apt) => getAppointmentStatus(apt) === "cancelada").length,
    expedientesPeriodo: periodMedicalRecords.length,
    pacientesConActividad: periodUniquePatientIds.size,
  };

  const cancellationRate = operationalSummary.totalCitas === 0
    ? 0
    : Math.round((operationalSummary.citasCanceladas / operationalSummary.totalCitas) * 100);

  const hasOperationalData = operationalSummary.totalCitas > 0 || operationalSummary.expedientesPeriodo > 0;

  const recordPatientIds = Array.from(
    new Set(medicalRecords.map((record) => getMedicalRecordPatientId(record)).filter(Boolean))
  );

  const patientsById = new Map(
    patients.map((patient) => [String(patient?.id ?? "").trim(), patient])
  );

  const patientsWithRecords = recordPatientIds
    .map((patientId) => {
      const patient = patientsById.get(patientId);
      return {
        id: patientId,
        patient,
        name: patient ? getPatientName(patient) : `Paciente ${patientId}`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedSupportPatient = patientsWithRecords.find((item) => item.id === selectedSupportPatientId) ?? null;

  const selectedPatientRecords = medicalRecords
    .filter((record) => getMedicalRecordPatientId(record) === selectedSupportPatientId)
    .sort((a, b) => {
      const first = getMedicalRecordSummaryDate(a)?.getTime() ?? 0;
      const second = getMedicalRecordSummaryDate(b)?.getTime() ?? 0;
      return second - first;
    });

  const canGenerateSupportDoc = Boolean(supportSubtype && selectedSupportPatientId && patientsWithRecords.length > 0);

  const periodRevenue = periodAppointments.reduce((acc, apt) => {
    const status = getAppointmentStatus(apt);
    if (status === "completada" || status === "completado" || status === "confirmada") {
      return acc + getAppointmentPrice(apt);
    }
    return acc;
  }, 0);

  const cancellations = periodAppointments.filter((apt) => getAppointmentStatus(apt) === "cancelada").length;
  const pendingAppointments = periodAppointments.filter((apt) => getAppointmentStatus(apt) === "pendiente").length;
  const confirmedAppointments = periodAppointments.filter((apt) => getAppointmentStatus(apt) === "confirmada").length;
  const completedAppointments = periodAppointments.filter((apt) => {
    const status = getAppointmentStatus(apt);
    return status === "completada" || status === "completado";
  }).length;

  const statusSummary = [
    { label: "Confirmadas", value: confirmedAppointments, className: "bg-blue-500" },
    { label: "Pendientes", value: pendingAppointments, className: "bg-amber-500" },
    { label: "Canceladas", value: cancellations, className: "bg-rose-500" },
    { label: "Completadas", value: completedAppointments, className: "bg-emerald-500" }
  ];

  const maxStatusValue = Math.max(...statusSummary.map((item) => item.value), 1);
  const trendData = getTrendData(period, periodAppointments, referenceDate);
  const trendTotal = trendData.reduce((acc, item) => acc + item.total, 0);
  const maxTrendValue = Math.max(...trendData.map((item) => item.total), 1);

  const recentActivities = [
    ...allAppointments.map((apt) => {
      const status = getStatusLabel(getAppointmentStatus(apt));
      const date =
        getDateFromFirestore(apt.actualizado_en) ??
        getDateFromFirestore(apt.creado_en) ??
        getDateFromFirestore(apt.fecha) ??
        new Date(0);

      return {
        title: `Cita ${status}`,
        description: `${getAppointmentPatientName(apt)} · ${getAppointmentType(apt)} · ${getAppointmentTime(apt)}`,
        date,
        icon: CalendarCheck
      };
    }),
    ...patients.map((patient) => {
      const date = getDateFromFirestore(patient.actualizado_en) ?? getDateFromFirestore(patient.creado_en) ?? new Date(0);
      return { title: "Paciente registrado", description: getPatientName(patient), date, icon: UserPlus };
    })
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  async function handleOpenAppointmentDetail(apt: any) {
    setSelectedAppointment(apt);
    setOpenAppointmentDetail(true);

    try {
      setLoadingAssignedForms(true);
      const assignments = await respuestaFormularioService.getAssignedForms(apt.id);
      setAssignedForms(assignments);

      const uniqueFormIds = Array.from(new Set(assignments.map((a) => a.formularioId).filter(Boolean)));
      const forms = await Promise.all(uniqueFormIds.map((formId) => formularioService.getById(formId)));
      const formMap: Record<string, FormularioClinico> = {};

      forms.forEach((form) => {
        if (form?.id) formMap[form.id] = form;
      });

      setFormsById(formMap);
    } catch (error) {
      console.error("Error cargando detalle de cita y formularios:", error);
      setAssignedForms([]);
      setFormsById({});
    } finally {
      setLoadingAssignedForms(false);
    }
  }

  function handleOpenFiller(assignment: any) {
    setSelectedAssignment(assignment);
    setOpenFillForm(true);
  }

  async function handleSaveFormResponse(values: Record<string, FormResponseValue>, status: "draft" | "completed") {
    if (!selectedAssignment?.id || !selectedAppointment?.id) return;

    try {
      setSavingFormResponse(true);
      await respuestaFormularioService.updateAssignedForm(selectedAssignment.id, {
        respuestas: values,
        estado: status
      });

      const refreshed = await respuestaFormularioService.getAssignedForms(selectedAppointment.id);
      setAssignedForms(refreshed);
      const updatedSelection = refreshed.find((item) => item.id === selectedAssignment.id) ?? null;
      setSelectedAssignment(updatedSelection);

      if (status === "completed") setOpenFillForm(false);
    } catch (error) {
      console.error("Error guardando respuesta del formulario:", error);
    } finally {
      setSavingFormResponse(false);
    }
  }

  function handleOpenSupportDocDialog() {
    setSupportDocError("");
    setSupportSubtype(null);
    setSelectedSupportPatientId("");
    setOpenSupportDocDialog(true);
  }

  function handleSelectSupportSubtype(subtype: ClinicalSupportSubtype) {
    setSupportSubtype(subtype);
    setSelectedSupportPatientId("");
    setSupportDocError("");
  }

  function handleGenerateSupportDocument() {
    if (!supportSubtype || !selectedSupportPatientId) {
      setSupportDocError("Seleccione un subtipo clínico y un paciente.");
      return;
    }

    if (!selectedSupportPatient) {
      setSupportDocError("No se pudo resolver la información del paciente seleccionado.");
      return;
    }

    setSupportDocError("");
    setGeneratingSupportDoc(true);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 16;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const subtypeLabel = getClinicalSubtypeLabel(supportSubtype);
      const generatedAt = new Date().toLocaleDateString("es-CR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const patient = selectedSupportPatient.patient;
      const patientName = selectedSupportPatient.name;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(30, 58, 95);
      pdf.text("Documento de apoyo clínico", margin, 18);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Paciente: ${patientName}`, margin, 24);
      pdf.text(`Tipo: ${subtypeLabel}`, margin, 29);
      pdf.text(`Generado el: ${generatedAt}`, margin, 34);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, 38, pageW - margin, 38);

      if (supportSubtype === "historia_resumida") {
        const latestRecordDate = getMedicalRecordSummaryDate(selectedPatientRecords[0]);
        const fallbackDate = latestRecordDate ?? getDateFromFirestore(patient?.actualizado_en ?? patient?.creado_en);
        const introDate = fallbackDate ? fallbackDate.toLocaleDateString("es-CR") : "—";

        const antecedentesPersonales = String(patient?.antecedentesPersonales ?? patient?.antecedentes_personales ?? "—");
        const antecedentesFamiliares = String(patient?.antecedentesFamiliares ?? patient?.antecedentes_familiares ?? "—");
        const alergias = toTextArray(patient?.alergias);
        const medicamentos = toTextArray(patient?.medicamentosActuales ?? patient?.medicamentos_actuales);

        autoTable(pdf, {
          startY: 44,
          head: [["Sección", "Contenido", "Fecha introducción"]],
          body: [
            ["Antecedentes personales", antecedentesPersonales || "—", introDate],
            ["Antecedentes familiares", antecedentesFamiliares || "—", introDate],
            ["Alergias", alergias.length > 0 ? alergias.join(", ") : "—", introDate],
            ["Medicamentos actuales", medicamentos.length > 0 ? medicamentos.join(", ") : "—", introDate],
          ],
          theme: "grid",
          styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
          headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 48 },
            1: { cellWidth: 90 },
            2: { cellWidth: 34 },
          },
          margin: { left: margin, right: margin },
        });
      }

      if (supportSubtype === "hoja_evolucion") {
        const rows = selectedPatientRecords.map((record: any) => {
          const fecha = formatDateTime(record?.fecha_consulta ?? record?.fechaConsulta ?? record?.creado_en);
          const motivo = String(record?.motivo_consulta ?? record?.motivoConsulta ?? "—");
          const diagnostico = String(record?.diagnostico_principal ?? record?.diagnostico ?? "—");
          const tratamiento = String(record?.plan_tratamiento ?? record?.tratamiento ?? "—");
          return [fecha, motivo, diagnostico, tratamiento];
        });

        autoTable(pdf, {
          startY: 44,
          head: [["Fecha", "Consulta", "Diagnóstico", "Tratamiento"]],
          body: rows.length > 0 ? rows : [["—", "Sin consultas registradas", "—", "—"]],
          theme: "grid",
          styles: { font: "helvetica", fontSize: 8.5, textColor: [51, 65, 85] },
          headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 48 },
            2: { cellWidth: 52 },
            3: { cellWidth: 52 },
          },
          margin: { left: margin, right: margin },
        });
      }

      if (supportSubtype === "datos") {
        const fullName = patient
          ? `${patient?.nombre ?? ""} ${patient?.apellidos ?? ""}`.trim() || patientName
          : patientName;

        const demographics = [
          ["Nombre", fullName],
          ["Identificación", String(patient?.cedula ?? "—")],
          ["Sexo", String(patient?.sexo ?? "—")],
          ["Edad", patient?.edad ? `${patient.edad} años` : "—"],
          ["Fecha de nacimiento", formatDateTime(patient?.fechaNacimiento ?? patient?.fecha_nacimiento)],
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
          startY: 44,
          head: [["Dato demográfico", "Valor"]],
          body: demographics,
          theme: "grid",
          styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
          headStyles: { fillColor: [45, 106, 159], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 64 },
            1: { cellWidth: 110 },
          },
          margin: { left: margin, right: margin },
        });

        const startY = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 10 : 110;

        autoTable(pdf, {
          startY,
          head: [["Dato de contacto", "Valor"]],
          body: contact,
          theme: "grid",
          styles: { font: "helvetica", fontSize: 9, textColor: [51, 65, 85] },
          headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 64 },
            1: { cellWidth: 110 },
          },
          margin: { left: margin, right: margin },
        });
      }

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Medi Notes · Página ${i} de ${totalPages}`, margin, pageH - 8);
      }

      pdf.save(`documento-apoyo-${selectedSupportPatientId}-${supportSubtype}.pdf`);
      setOpenSupportDocDialog(false);
    } catch (error) {
      console.error("Error generando documento de apoyo:", error);
      setSupportDocError("No se pudo generar el documento. Intente nuevamente.");
    } finally {
      setGeneratingSupportDoc(false);
    }
  }

  function getAssignmentStatusClass(status: string) {
    if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "draft") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  }

  const metrics = [
    {
      title: "Citas",
      value: periodAppointments.length,
      change: metricScopeLabel,
      trend: "neutral" as const,
      icon: CalendarCheck,
      colorClass: "bg-blue-50 text-blue-600"
    },
    {
      title: "Pacientes Total",
      value: patients.length,
      change: "Activos registrados",
      trend: "up" as const,
      icon: Users,
      colorClass: "bg-purple-50 text-purple-600"
    },
    {
      title: "Cancelaciones",
      value: cancellations,
      change: metricScopeLabel,
      trend: "down" as const,
      icon: XCircle,
      colorClass: "bg-rose-50 text-rose-600"
    },
    {
      title: "Ingresos estimados",
      value: `₡${periodRevenue.toLocaleString("es-CR")}`,
      change: metricScopeLabel,
      trend: "up" as const,
      icon: DollarSign,
      colorClass: "bg-emerald-50 text-emerald-600"
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Dashboard Principal</h1>
          <p className="text-gray-500 mt-1">A continuación se presenta información de su consultorio</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11" onClick={() => router.push("/configuracion")}>Configuración</Button>
          <Button className="h-11 bg-accent hover:bg-accent/90 text-white" onClick={() => router.push("/citas")}>Nueva Cita</Button>
        </div>
      </div>

      <DashboardSectionHeader
        number="01"
        title="Resumen general"
        description="Indicadores principales y filtros para consultar la actividad del consultorio."
      />

      <div className="card-notion p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Período seleccionado</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">{periodTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">{periodCaption}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {period !== "historico" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setReferenceDate((current) => moveReferenceDate(current, period, "prev"))}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="h-9 text-xs" onClick={() => setReferenceDate(new Date())}>Actual</Button>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setReferenceDate((current) => moveReferenceDate(current, period, "next"))}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Día", value: "dia" as Period },
                { label: "Semana", value: "semana" as Period },
                { label: "Mes", value: "mes" as Period },
                { label: "Histórico", value: "historico" as Period }
              ].map((item) => (
                <Button
                  key={item.value}
                  variant={period === item.value ? "default" : "outline"}
                  className={cn("h-9 text-xs", period === item.value && "bg-accent hover:bg-accent/90 text-white")}
                  onClick={() => setPeriod(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => <MetricCard key={idx} {...m} />)}
        </div>
      )}

      <DashboardSectionHeader
        number="02"
        title="Gestión clínica y documental"
        description="Resumen operativo, expedientes y documentos de apoyo para el período seleccionado."
      />

      {!loading && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resumen documental
              </h2>
              <p className="text-sm text-gray-500 mt-1">Información operativa organizada para el período seleccionado.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-50 text-gray-700 border-gray-100">{shortPeriodLabel}</Badge>
              <Button variant="outline" className="h-9 text-xs" onClick={handleOpenSupportDocDialog}>
                <FileText className="w-4 h-4 mr-2" />
                Generar documento de apoyo
              </Button>
            </div>
          </div>

          {!hasOperationalData ? (
            <div className="card-notion p-8 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay información operativa para este período.</p>
              <p className="text-sm mt-1">Registre citas o expedientes para visualizar el resumen documental.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-notion p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Actividad de citas</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Programadas</span>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-100">{operationalSummary.citasProgramadas}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Realizadas</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">{operationalSummary.citasRealizadas}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Canceladas</span>
                    <Badge className="bg-rose-50 text-rose-700 border-rose-100">{operationalSummary.citasCanceladas}</Badge>
                  </div>
                </div>
              </div>

              <div className="card-notion p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Información clínica documental</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Expedientes registrados</span>
                    <span className="font-semibold text-gray-900">{operationalSummary.expedientesPeriodo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pacientes con actividad</span>
                    <span className="font-semibold text-gray-900">{operationalSummary.pacientesConActividad}</span>
                  </div>
                </div>
              </div>

              <div className="card-notion p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Indicadores operativos</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Total de citas</span>
                    <span className="font-semibold text-gray-900">{operationalSummary.totalCitas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ingresos estimados</span>
                    <span className="font-semibold text-gray-900">₡{periodRevenue.toLocaleString("es-CR")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tasa de cancelación</span>
                    <span className="font-semibold text-gray-900">{cancellationRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={openSupportDocDialog}
        onOpenChange={(open) => {
          setOpenSupportDocDialog(open);
          if (!open) {
            setSupportSubtype(null);
            setSelectedSupportPatientId("");
            setSupportDocError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generar documento de apoyo</DialogTitle>
            <DialogDescription>
              Tipo: Clínico · Alcance: Por paciente. Seleccione un subtipo y luego el paciente con expediente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Subtipo clínico</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "historia_resumida" as ClinicalSupportSubtype, label: "Historia clínica resumida" },
                  { id: "hoja_evolucion" as ClinicalSupportSubtype, label: "Hoja de evolución" },
                  { id: "datos" as ClinicalSupportSubtype, label: "Datos" },
                ].map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={supportSubtype === option.id ? "default" : "outline"}
                    className={cn("h-auto py-3 text-xs text-left justify-start", supportSubtype === option.id && "bg-accent hover:bg-accent/90 text-white")}
                    onClick={() => handleSelectSupportSubtype(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {supportSubtype && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Pacientes con expediente</p>
                {patientsWithRecords.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                    No hay pacientes con expediente disponible.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {patientsWithRecords.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedSupportPatientId(item.id);
                          setSupportDocError("");
                        }}
                        className={cn(
                          "text-left rounded-lg border px-3 py-2 transition-colors",
                          selectedSupportPatientId === item.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">ID expediente: {item.id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {supportSubtype && selectedSupportPatient && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                Se generará: <span className="font-semibold">{getClinicalSubtypeLabel(supportSubtype)}</span> para <span className="font-semibold">{selectedSupportPatient.name}</span>.
                {supportSubtype === "hoja_evolucion" && (
                  <span className="block text-xs mt-1 text-blue-700">Consultas encontradas: {selectedPatientRecords.length}</span>
                )}
              </div>
            )}

            {supportDocError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {supportDocError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenSupportDocDialog(false)}
              >
                Cancelar
              </Button>
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
                    Generar PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DashboardSectionHeader
        number="03"
        title="Análisis y rendimiento"
        description="Tendencias de citas, distribución por estado y análisis financiero estimado."
      />

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card-notion p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Tendencia de citas
                </h2>
                <p className="text-sm text-gray-500 mt-1">Distribución de citas según el período seleccionado.</p>
              </div>
              <Badge className="bg-gray-50 text-gray-700 border-gray-100">{shortPeriodLabel}</Badge>
            </div>

            {trendTotal === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-center text-gray-400">
                <CalendarCheck className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No hay citas registradas para este período.</p>
              </div>
            ) : (
              <div className="h-52 flex items-end justify-between gap-3 overflow-x-auto pb-2">
                {trendData.map((item) => (
                  <div key={item.label} className="min-w-[58px] flex-1 flex flex-col items-center gap-3">
                    <div className="w-full h-36 flex items-end justify-center">
                      <div
                        className="w-full max-w-[42px] rounded-t-xl bg-primary/80 transition-all"
                        style={{ height: `${Math.max(12, (item.total / maxTrendValue) * 130)}px` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">{item.total}</p>
                      <p className="text-xs capitalize text-gray-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-notion p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Estado de citas</h2>
                <p className="text-sm text-gray-500 mt-1">Resumen del período seleccionado.</p>
              </div>
              <Badge className="bg-gray-50 text-gray-700 border-gray-100">{periodAppointments.length} citas</Badge>
            </div>

            <div className="space-y-5">
              {statusSummary.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", item.className)}
                      style={{ width: item.value === 0 ? "0%" : `${Math.max(8, (item.value / maxStatusValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <DashboardFinancialAnalysis
          appointments={periodAppointments}
          periodLabel={shortPeriodLabel}
        />
      )}

      <DashboardSectionHeader
        number="04"
        title="Agenda y actividad"
        description="Calendario interactivo y últimos movimientos registrados en el sistema."
      />

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DashboardCalendarPreview
              appointments={allAppointments}
              onOpenAppointment={handleOpenAppointmentDetail}
              onOpenCalendar={() => router.push("/calendario")}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Últimos movimientos</h2>
              <p className="text-sm text-gray-500 mt-1">Cambios recientes en citas y pacientes.</p>
            </div>

            <div className="card-notion p-6">
              {recentActivities.length === 0 ? (
                <div className="text-sm text-gray-400">No hay actividad reciente.</div>
              ) : (
                <div className="space-y-5">
                  {recentActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex gap-4 items-start relative">
                        {index !== recentActivities.length - 1 && (
                          <div className="absolute left-4 top-10 bottom-[-18px] w-[1px] bg-gray-100" />
                        )}
                        <div className="p-2 rounded-lg shrink-0 z-10 bg-blue-100 text-blue-600">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{formatActivityDate(activity.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" className="w-full mt-2 text-xs" onClick={() => router.push("/reportes")}>
                    Ver registro completo
                    <ChevronRight className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DashboardSectionHeader
        number="05"
        title="Seguimiento de citas"
        description="Historial de consultas, próximas citas confirmadas y cancelaciones."
      />

      {!loading && (
        <PastAppointmentsList
          appointments={allAppointments}
          onOpenAppointment={handleOpenAppointmentDetail}
        />
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <UpcomingAppointmentsList
            appointments={allAppointments}
            onOpenAppointment={handleOpenAppointmentDetail}
          />

          <CancelledAppointmentsList
            appointments={allAppointments}
            onOpenAppointment={handleOpenAppointmentDetail}
          />
        </div>
      )}


      <Dialog
        open={openAppointmentDetail}
        onOpenChange={(open) => {
          setOpenAppointmentDetail(open);
          if (!open) {
            setSelectedAppointment(null);
            setAssignedForms([]);
            setFormsById({});
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de cita</DialogTitle>
            <DialogDescription>Revise la información de la cita y complete el formulario previamente asignado.</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6 mt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Paciente</p>
                <p className="font-semibold text-gray-900">{getAppointmentPatientName(selectedAppointment)}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Hora</p>
                    <p className="font-medium text-gray-900">{getAppointmentTime(selectedAppointment)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tipo</p>
                    <p className="font-medium text-gray-900">{getAppointmentType(selectedAppointment)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <Badge className={cn("capitalize", getAssignmentStatusClass(getAppointmentStatus(selectedAppointment)))}>
                      {getAppointmentStatus(selectedAppointment)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Formulario asignado</h3>
                {loadingAssignedForms ? (
                  <div className="rounded-xl border border-gray-200 p-6 flex items-center justify-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Cargando formularios...
                  </div>
                ) : assignedForms.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                    Esta cita no tiene formularios asignados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignedForms.map((assignment) => (
                      <div key={assignment.id} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{assignment.formularioNombre}</p>
                          <p className="text-xs text-gray-500">{assignment.formularioEspecialidad}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("capitalize", getAssignmentStatusClass(assignment.estado))}>
                            {assignment.estado === "assigned" ? "asignado" : assignment.estado === "draft" ? "borrador" : "completado"}
                          </Badge>
                          <Button size="sm" onClick={() => handleOpenFiller(assignment)}>
                            <FileText className="w-4 h-4 mr-2" />
                            {assignment.estado === "completed" ? "Ver" : "Llenar"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CitaFormFiller
        open={openFillForm}
        onOpenChange={(open) => {
          setOpenFillForm(open);
          if (!open) setSelectedAssignment(null);
        }}
        formulario={selectedAssignment?.formularioId ? formsById[selectedAssignment.formularioId] ?? null : null}
        assignment={selectedAssignment}
        onSave={handleSaveFormResponse}
        saving={savingFormResponse}
      />
    </div>
  );
}
