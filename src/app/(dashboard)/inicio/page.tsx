
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  CalendarCheck, 
  XCircle, 
  DollarSign, 
  MoreVertical, 
  ChevronRight,
  Clock,
  UserPlus,
  Loader2,
  FileText
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appointmentService, patientService } from "@/lib/firebase/db-service";
import { respuestaFormularioService } from "@/lib/firebase/respuestaFormularioService";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico } from "@/lib/types/formulario.types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CitaFormFiller, FormResponseValue } from "../calendario/components/CitaFormFiller";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openAppointmentDetail, setOpenAppointmentDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [assignedForms, setAssignedForms] = useState<any[]>([]);
  const [formsById, setFormsById] = useState<Record<string, FormularioClinico>>({});
  const [loadingAssignedForms, setLoadingAssignedForms] = useState(false);
  const [openFillForm, setOpenFillForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [savingFormResponse, setSavingFormResponse] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [todayApts, allApts, pts] = await Promise.all([
          appointmentService.getToday(),
          appointmentService.getAll(),
          patientService.getAll()
        ]);
        setAppointments(todayApts);
        setAllAppointments(allApts);
        setPatientsCount(pts.length);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Cálculo funcional de ingresos del mes actual basado en datos de Firestore
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = allAppointments.reduce((acc, apt) => {
    const date = apt.fecha?.seconds ? new Date(apt.fecha.seconds * 1000) : new Date(apt.fecha);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && apt.estado === 'completada') {
      return acc + (apt.precio || 0);
    }
    return acc;
  }, 0);

  const cancellations = allAppointments.filter(apt => apt.estado === 'cancelada').length;

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
        if (form?.id) {
          formMap[form.id] = form;
        }
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
        estado: status,
      });

      const refreshed = await respuestaFormularioService.getAssignedForms(selectedAppointment.id);
      setAssignedForms(refreshed);
      const updatedSelection = refreshed.find((item) => item.id === selectedAssignment.id) ?? null;
      setSelectedAssignment(updatedSelection);

      if (status === "completed") {
        setOpenFillForm(false);
      }
    } catch (error) {
      console.error("Error guardando respuesta del formulario:", error);
    } finally {
      setSavingFormResponse(false);
    }
  }

  function getAssignmentStatusClass(status: string) {
    if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "draft") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  }

  const metrics = [
    { title: "Citas Hoy", value: appointments.length, change: "Hoy", trend: 'neutral' as const, icon: CalendarCheck, colorClass: "bg-blue-50 text-blue-600" },
    { title: "Pacientes Total", value: patientsCount, change: "Activos", trend: 'up' as const, icon: Users, colorClass: "bg-purple-50 text-purple-600" },
    { title: "Cancelaciones", value: cancellations, change: "Total", trend: 'down' as const, icon: XCircle, colorClass: "bg-rose-50 text-rose-600" },
    { title: "Ingresos Mes", value: `₡${monthlyRevenue.toLocaleString()}`, change: "Completadas", trend: 'up' as const, icon: DollarSign, colorClass: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Bienvenido, Dr. Solano</h1>
          <p className="text-gray-500 mt-1">Aquí está lo que está pasando hoy en su consultorio.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11">Configuración</Button>
          <Button className="h-11 bg-accent hover:bg-accent/90 text-white">Nueva Cita</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => (
            <MetricCard key={idx} {...m} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Citas para hoy
            </h2>
            <Button variant="ghost" className="text-sm text-primary">Ver todas</Button>
          </div>
          <div className="card-notion overflow-hidden p-0 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <CalendarCheck className="w-10 h-10 mb-2 opacity-20" />
                <p>No hay citas registradas para hoy.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appointments.map((apt, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenAppointmentDetail(apt)}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-bold text-gray-900 w-12">{apt.hora_inicio}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors cursor-pointer">{apt.paciente_nombre}</h4>
                        <p className="text-xs text-gray-500">{apt.tipo_consulta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={cn(
                        "capitalize px-3 py-1 text-[10px]",
                        apt.estado === 'completada' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        apt.estado === 'confirmada' ? "bg-blue-50 text-blue-700 border-blue-100" : 
                        "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {apt.estado}
                      </Badge>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Actividad reciente</h2>
          </div>
          <div className="card-notion p-6 space-y-6">
            <div className="flex gap-4 items-start relative pb-6">
              <div className="absolute left-4 top-10 bottom-0 w-[1px] bg-gray-100"></div>
              <div className="p-2 rounded-lg shrink-0 z-10 bg-blue-100 text-blue-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sistema en línea</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2 text-xs">
              Ver registro completo
              <ChevronRight className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      </div>

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
            <DialogDescription>
              Revise la información de la cita y complete el formulario previamente asignado.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6 mt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Paciente</p>
                <p className="font-semibold text-gray-900">{selectedAppointment.paciente_nombre}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Hora</p>
                    <p className="font-medium text-gray-900">{selectedAppointment.hora_inicio}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tipo</p>
                    <p className="font-medium text-gray-900">{selectedAppointment.tipo_consulta}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <Badge className={cn("capitalize", getAssignmentStatusClass(selectedAppointment.estado))}>
                      {selectedAppointment.estado}
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
                            {assignment.estado === "assigned"
                              ? "asignado"
                              : assignment.estado === "draft"
                              ? "borrador"
                              : "completado"}
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
