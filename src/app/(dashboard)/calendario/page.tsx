"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { appointmentService } from "@/lib/firebase/db-service";
import { formularioService } from "@/lib/firebase/formularioService";
import { respuestaFormularioService } from "@/lib/firebase/respuestaFormularioService";
import { FormularioClinico } from "@/lib/types/formulario.types";
import { CitaFormulariosModal } from "./components/CitaFormulariosModal";
import { CitaFormFiller } from "./components/CitaFormFiller";
import { VerFormularioCitaModal } from "./components/VerFormularioCitaModal";

type AppointmentForm = {
  paciente_nombre: string;
  tipo_consulta: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  monto: number;
  notas: string;
};

const emptyAppointment: AppointmentForm = {
  paciente_nombre: "",
  tipo_consulta: "Primera cita",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  estado: "programada",
  monto: 0,
  notas: "",
};

function formatCurrency(value: number | string) {
  return `₡${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function generarHorarios() {
  const horarios: string[] = [];

  for (let hora = 6; hora <= 22; hora++) {
    ["00", "15", "30", "45"].forEach((minuto) => {
      horarios.push(`${String(hora).padStart(2, "0")}:${minuto}`);
    });
  }

  return horarios;
}

export default function CalendarPage() {
  const [validationMessage, setValidationMessage] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAllAvailability, setShowAllAvailability] = useState(false);
  const [viewMode, setViewMode] = useState<"dia" | "semana" | "mes">("dia");

  const [openNewAppointment, setOpenNewAppointment] = useState(false);
  const [openEditAppointment, setOpenEditAppointment] = useState(false);
  const [openCitaFormularios, setOpenCitaFormularios] = useState(false);
  const [openFillForm, setOpenFillForm] = useState(false);
  const [openViewForm, setOpenViewForm] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedAppointmentForForms, setSelectedAppointmentForForms] = useState<any | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [availableFormularios, setAvailableFormularios] = useState<FormularioClinico[]>([]);
  const [assignedForms, setAssignedForms] = useState<any[]>([]);
  const [loadingFormularios, setLoadingFormularios] = useState(false);
  const [savingFormulario, setSavingFormulario] = useState(false);

  const [newAppointment, setNewAppointment] =
    useState<AppointmentForm>(emptyAppointment);
  const [editAppointment, setEditAppointment] =
    useState<AppointmentForm>(emptyAppointment);

  useEffect(() => {
    loadAppointments();
    loadFormularios();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      const data = await appointmentService.getAll();
      setAppointments(data);
    } catch (error) {
      console.error("Error cargando citas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormularios() {
    try {
      setLoadingFormularios(true);
      const data = await formularioService.getCurrentActive();
      setAvailableFormularios(data);
    } catch (error) {
      console.error("Error cargando formularios:", error);
      setAvailableFormularios([]);
    } finally {
      setLoadingFormularios(false);
    }
  }

  async function loadAssignedForms(citaId: string) {
    try {
      setLoadingFormularios(true);
      const data = await respuestaFormularioService.getAssignedForms(citaId);
      setAssignedForms(data);
    } catch (error) {
      console.error("Error cargando formularios asignados:", error);
      setAssignedForms([]);
    } finally {
      setLoadingFormularios(false);
    }
  }

  function crearFechaLocal(fecha: string) {
    const [year, month, day] = fecha.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function obtenerFechaCita(fecha: any) {
    if (fecha?.seconds) return new Date(fecha.seconds * 1000);
    if (fecha?.toDate) return fecha.toDate();
    return new Date(fecha);
  }

  function formatInputDate(fecha: any) {
    const fechaObj = obtenerFechaCita(fecha);
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, "0");
    const day = String(fechaObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function cambiarMes(cantidad: number) {
    setMonth((prev) => {
      const nuevoMes = new Date(prev);
      nuevoMes.setMonth(prev.getMonth() + cantidad);
      return nuevoMes;
    });
  }

  function obtenerInicioSemana(fecha: Date) {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDay();
    const diferencia = dia === 0 ? -6 : 1 - dia;
    nuevaFecha.setDate(nuevaFecha.getDate() + diferencia);
    return nuevaFecha;
  }

  function obtenerDiasSemana(fecha: Date) {
    const inicioSemana = obtenerInicioSemana(fecha);

    return Array.from({ length: 7 }, (_, index) => {
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + index);
      return dia;
    });
  }

  function obtenerCitasPorDia(fecha: Date) {
    return appointments
      .filter((apt) => {
        const fechaCita = obtenerFechaCita(apt.fecha);
        return fechaCita.toDateString() === fecha.toDateString();
      })
      .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
  }

  function obtenerHorariosLaborales() {
  return generarHorarios().filter((hora) => hora >= "08:00" && hora <= "17:00");
    }

    function obtenerCitaEnHorario(fecha: Date, hora: string) {
      return obtenerCitasPorDia(fecha).find(
        (apt) =>
          apt.hora_inicio === hora &&
          normalizarEstado(apt.estado) !== "cancelada"
      );
    }



  function formatMonthYear(fecha: Date) {
    return `${fecha.toLocaleDateString("es-ES", {
      month: "long",
    })} ${fecha.getFullYear()}`;
  }

  function normalizarEstado(estado: string) {
    return String(estado || "").toLowerCase();
  }

  function existeChoqueHorario(
    fecha: string,
    horaInicio: string,
    citaIdActual?: string
  ) {
    return appointments.some((apt) => {
      const mismaCita = citaIdActual && apt.id === citaIdActual;
      if (mismaCita) return false;

      const estado = normalizarEstado(apt.estado);
      if (estado === "cancelada") return false;

      const fechaApt = formatInputDate(apt.fecha);
      const horaApt = apt.hora_inicio;

      return fechaApt === fecha && horaApt === horaInicio;
    });
  }

  function getBadgeClass(estado: string) {
    const estadoNormalizado = normalizarEstado(estado);

    if (estadoNormalizado === "completada") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (estadoNormalizado === "confirmada") {
      return "bg-blue-50 text-blue-700";
    }

    if (estadoNormalizado === "cancelada") {
      return "bg-red-50 text-red-700";
    }

    return "bg-amber-50 text-amber-700";
  }

  function getAppointmentSlotClass(estado: string) {
    const estadoNormalizado = normalizarEstado(estado);

    if (estadoNormalizado === "completada") {
      return "w-full text-left rounded-lg bg-emerald-50 border border-emerald-100 p-2 hover:bg-emerald-100 transition text-emerald-800";
    }

    if (estadoNormalizado === "confirmada") {
      return "w-full text-left rounded-lg bg-blue-50 border border-blue-100 p-2 hover:bg-blue-100 transition text-blue-800";
    }

    if (estadoNormalizado === "cancelada") {
      return "w-full text-left rounded-lg bg-red-50 border border-red-100 p-2 hover:bg-red-100 transition text-red-800";
    }

    return "w-full text-left rounded-lg bg-amber-50 border border-amber-100 p-2 hover:bg-amber-100 transition text-amber-800";
  }


  function handleCreateFromSlot(
  fecha: Date,
  hora: string
) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  setNewAppointment({
    ...emptyAppointment,
    fecha: `${year}-${month}-${day}`,
    hora_inicio: hora,
  });

  setValidationMessage("");
  setOpenNewAppointment(true);
}

  async function handleCreateAppointment() {
    if (
      !newAppointment.paciente_nombre ||
      !newAppointment.fecha ||
      !newAppointment.hora_inicio
    ) {
      setValidationMessage("Complete paciente, fecha y hora de inicio.");
      return;
    }

    if (existeChoqueHorario(newAppointment.fecha, newAppointment.hora_inicio)) {
      setValidationMessage(
        "Ya existe una cita activa en esa fecha y hora. Solo puede reutilizarse si la cita anterior está cancelada."
      );
      return;
    }

    try {
      setSaving(true);

      const fechaCita = crearFechaLocal(newAppointment.fecha);

      await appointmentService.create({
        ...newAppointment,
        fecha: fechaCita,
      });

      await loadAppointments();

      setValidationMessage("");
      setDate(fechaCita);
      setMonth(fechaCita);
      setOpenNewAppointment(false);
      setNewAppointment(emptyAppointment);
    } catch (error) {
      console.error("Error creando cita:", error);
      setValidationMessage("No se pudo crear la cita. Intente nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenEditAppointment(apt: any) {
    setSelectedAppointment(apt);
    setValidationMessage("");

    setEditAppointment({
      paciente_nombre: apt.paciente_nombre || "",
      tipo_consulta: apt.tipo_consulta || "Primera cita",
      fecha: formatInputDate(apt.fecha),
      hora_inicio: apt.hora_inicio || "",
      hora_fin: apt.hora_fin || "",
      estado: normalizarEstado(apt.estado) || "programada",
      monto: Number(apt.monto || 0),
      notas: apt.notas || "",
    });

    setOpenEditAppointment(true);
  }

  async function handleOpenAppointmentForms(apt: any) {
    setSelectedAppointmentForForms(apt);
    setOpenCitaFormularios(true);
    await loadAssignedForms(apt.id);
  }

  async function handleAssignForm(formulario: FormularioClinico) {
    if (!selectedAppointmentForForms?.id) return;

    try {
      setSavingFormulario(true);
      const payload = {
        citaId: selectedAppointmentForForms.id,
        formularioId: formulario.id ?? "",
        formularioNombre: formulario.nombre,
        formularioEspecialidad: formulario.especialidad,
        formularioVersion: formulario.version,
        ...(selectedAppointmentForForms.paciente_id
          ? { pacienteId: selectedAppointmentForForms.paciente_id }
          : {}),
      };

      await respuestaFormularioService.assignFormToCita(payload);
      await loadAssignedForms(selectedAppointmentForForms.id);
    } catch (error) {
      console.error("Error asignando formulario a cita:", error);
    } finally {
      setSavingFormulario(false);
    }
  }

  async function handleRemoveAssignedForm(assignmentId: string) {
    try {
      setSavingFormulario(true);
      await respuestaFormularioService.deleteAssignedForm(assignmentId);
      if (selectedAppointmentForForms?.id) {
        await loadAssignedForms(selectedAppointmentForForms.id);
      }
    } catch (error) {
      console.error("Error eliminando formulario asignado:", error);
    } finally {
      setSavingFormulario(false);
    }
  }

  function getAssignmentFormulario(assignment: any) {
    if (!assignment?.formularioId) return null;
    return availableFormularios.find((form) => form.id === assignment.formularioId) ?? null;
  }

  function handleFillForm(assignment: any) {
    setSelectedAssignment(assignment);
    setOpenFillForm(true);
  }

  function handleViewForm(assignment: any) {
    setSelectedAssignment(assignment);
    setOpenViewForm(true);
  }

  async function handleSaveFormResponse(values: Record<string, any>, status: "draft" | "completed") {
    if (!selectedAssignment?.id) return;

    try {
      setSavingFormulario(true);
      await respuestaFormularioService.updateAssignedForm(selectedAssignment.id, {
        respuestas: values,
        estado: status,
      });
      if (selectedAppointmentForForms?.id) {
        await loadAssignedForms(selectedAppointmentForForms.id);
      }
      setOpenFillForm(false);
      setOpenViewForm(status === "completed");
    } catch (error) {
      console.error("Error guardando respuestas de formulario:", error);
    } finally {
      setSavingFormulario(false);
    }
  }

  async function handleUpdateAppointment() {
    if (!selectedAppointment?.id) {
      setValidationMessage("La cita no tiene identificador. No se puede actualizar.");
      return;
    }

    if (
      !editAppointment.paciente_nombre ||
      !editAppointment.fecha ||
      !editAppointment.hora_inicio
    ) {
      setValidationMessage("Complete paciente, fecha y hora de inicio.");
      return;
    }

    if (
      normalizarEstado(editAppointment.estado) !== "cancelada" &&
      existeChoqueHorario(
        editAppointment.fecha,
        editAppointment.hora_inicio,
        selectedAppointment.id
      )
    ) {
      setValidationMessage(
        "Ya existe una cita activa en esa fecha y hora. Solo puede reutilizarse si la cita anterior está cancelada."
      );
      return;
    }

    try {
      setSaving(true);

      const fechaCita = crearFechaLocal(editAppointment.fecha);

      await appointmentService.update(selectedAppointment.id, {
        ...editAppointment,
        fecha: fechaCita,
      });

      await loadAppointments();

      setValidationMessage("");
      setDate(fechaCita);
      setMonth(fechaCita);
      setOpenEditAppointment(false);
      setSelectedAppointment(null);
      setEditAppointment(emptyAppointment);
    } catch (error) {
      console.error("Error editando cita:", error);
      setValidationMessage("No se pudo actualizar la cita. Intente nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAppointment() {
    if (!selectedAppointment?.id) {
      setValidationMessage("La cita no tiene identificador. No se puede eliminar.");
      return;
    }

    try {
      setSaving(true);

      await appointmentService.delete(selectedAppointment.id);
      await loadAppointments();

      setValidationMessage("");
      setOpenEditAppointment(false);
      setSelectedAppointment(null);
      setEditAppointment(emptyAppointment);
    } catch (error) {
      console.error("Error eliminando cita:", error);
      setValidationMessage("No se pudo eliminar la cita. Intente nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const selectedDayApts = date ? obtenerCitasPorDia(date) : [];
  const appointmentDates = appointments.map((apt) => obtenerFechaCita(apt.fecha));
  const weekDays = date ? obtenerDiasSemana(date) : obtenerDiasSemana(new Date());

  return (
    <div className="w-full px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="text-primary" />
            Calendario
          </h1>
          <p className="text-gray-500 mt-1">
            Organice y gestione sus consultas médicas.
          </p>
        </div>

        <Button
          className="bg-accent hover:bg-accent/90"
          onClick={() => {
            setValidationMessage("");
            setOpenNewAppointment(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva cita
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={viewMode === "dia" ? "default" : "outline"}
          onClick={() => setViewMode("dia")}
        >
          Día
        </Button>

        <Button
          variant={viewMode === "semana" ? "default" : "outline"}
          onClick={() => setViewMode("semana")}
        >
          Semana
        </Button>

        <Button
          variant={viewMode === "mes" ? "default" : "outline"}
          onClick={() => setViewMode("mes")}
        >
          Mes
        </Button>
      </div>

      {openNewAppointment && (
        <AppointmentModal
          title="Crear nueva cita"
          appointment={newAppointment}
          setAppointment={setNewAppointment}
          onClose={() => {
            setValidationMessage("");
            setOpenNewAppointment(false);
          }}
          onSubmit={handleCreateAppointment}
          submitText="Crear cita"
          saving={saving}
          validationMessage={validationMessage}
          setValidationMessage={setValidationMessage}
        />
      )}

      {openEditAppointment && (
        <AppointmentModal
          title="Editar cita"
          appointment={editAppointment}
          setAppointment={setEditAppointment}
          onClose={() => {
            setValidationMessage("");
            setOpenEditAppointment(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleUpdateAppointment}
          submitText="Guardar cambios"
          saving={saving}
          validationMessage={validationMessage}
          setValidationMessage={setValidationMessage}
          onDelete={handleDeleteAppointment}
        />
      )}

      <CitaFormulariosModal
        open={openCitaFormularios}
        onOpenChange={(open) => {
          setOpenCitaFormularios(open);
          if (!open) {
            setSelectedAppointmentForForms(null);
            setAssignedForms([]);
          }
        }}
        appointment={selectedAppointmentForForms}
        assignedForms={assignedForms}
        availableForms={availableFormularios}
        onAssignForm={handleAssignForm}
        onFillForm={handleFillForm}
        onViewForm={handleViewForm}
        onRemoveAssignment={handleRemoveAssignedForm}
        loading={loadingFormularios || savingFormulario}
      />

      <CitaFormFiller
        open={openFillForm}
        onOpenChange={(open) => {
          setOpenFillForm(open);
          if (!open) setSelectedAssignment(null);
        }}
        formulario={getAssignmentFormulario(selectedAssignment)}
        assignment={selectedAssignment}
        onSave={handleSaveFormResponse}
        saving={savingFormulario}
      />

      <VerFormularioCitaModal
        open={openViewForm}
        onOpenChange={(open) => {
          setOpenViewForm(open);
          if (!open) setSelectedAssignment(null);
        }}
        formulario={getAssignmentFormulario(selectedAssignment)}
        assignment={selectedAssignment}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <div className="space-y-6">
          <div className="card-notion p-5 flex justify-center">
              <div className="w-[360px]">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => cambiarMes(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <p className="text-base font-semibold capitalize text-gray-900">
                  {formatMonthYear(month)}
                </p>

                <Button variant="ghost" size="icon" onClick={() => cambiarMes(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                month={month}
                onMonthChange={setMonth}
                modifiers={{
                  hasAppointment: appointmentDates,
                }}
                modifiersClassNames={{
                  hasAppointment: "bg-purple-100 text-purple-700",
                }}
                classNames={{
                  caption: "hidden",
                  nav: "hidden",
                }}
                className="rounded-md border-none mx-auto w-fit"
              />

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-purple-100 border border-purple-300" />
                <span>Días con citas programadas</span>
              </div>
            </div>
          </div>

          <div className="card-notion p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">
              Estados
            </h3>

            <div className="space-y-3">
              <Legend color="bg-blue-500" text="Confirmada" />
              <Legend color="bg-amber-500" text="Programada" />
              <Legend color="bg-emerald-500" text="Completada" />
              <Legend color="bg-red-500" text="Cancelada" />
            </div>
          </div>
        </div>

 <div className="card-notion min-h-[750px] min-w-0 w-full bg-white p-0 overflow-hidden flex flex-col">
  <div className="p-5 border-b flex items-center justify-between bg-gray-50/50">
    <h2 className="font-bold text-xl capitalize">
    {viewMode === "semana"
      ? `Vista Semanal - ${month.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        })}`
      : viewMode === "mes"
      ? "Resumen mensual"
      : date?.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
  </h2>

  {viewMode === "semana" && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowAllAvailability(!showAllAvailability)}
    >
      {showAllAvailability ? "Ver menos" : "Ver todo el día"}
    </Button>
  )}
</div>

          <div className="flex-1 p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Cargando agenda...</p>
              </div>
            ) : viewMode === "semana" ? (
              <WeekView
                weekDays={weekDays}
                obtenerHorariosLaborales={obtenerHorariosLaborales}
                obtenerCitaEnHorario={obtenerCitaEnHorario}
                onEdit={handleOpenEditAppointment}
                onForms={handleOpenAppointmentForms}
                onCreateAppointment={handleCreateFromSlot}
                getAppointmentSlotClass={getAppointmentSlotClass}
                showAllAvailability={showAllAvailability}
              />
            ) : viewMode === "mes" ? (
              <MonthView
                appointments={appointments}
                month={month}
                obtenerFechaCita={obtenerFechaCita}
                getBadgeClass={getBadgeClass}
                onEdit={handleOpenEditAppointment}
                onForms={handleOpenAppointmentForms}
              />
            ) : selectedDayApts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {selectedDayApts.map((apt, idx) => (
                  <AppointmentCard
                    key={apt.id || idx}
                    apt={apt}
                    getBadgeClass={getBadgeClass}
                    onEdit={() => handleOpenEditAppointment(apt)}
                    onForms={() => handleOpenAppointmentForms(apt)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
     </div>
  );
}

function AppointmentModal({
  title,
  appointment,
  setAppointment,
  onClose,
  onSubmit,
  submitText,
  saving,
  validationMessage,
  setValidationMessage,
  onDelete,
}: {
  title: string;
  appointment: AppointmentForm;
  setAppointment: any;
  onClose: () => void;
  onSubmit: () => void;
  submitText: string;
  saving: boolean;
  validationMessage: string;
  setValidationMessage: (message: string) => void;
  onDelete?: () => void;
}) {
  const disabled =
    saving ||
    !appointment.paciente_nombre ||
    !appointment.fecha ||
    !appointment.hora_inicio;

  const horarios = generarHorarios();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-[520px] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>

          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {validationMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="font-semibold text-amber-900">
                Aviso
              </p>

              <p className="text-sm text-amber-700 mt-1">
                {validationMessage}
              </p>

              <button
                type="button"
                className="mt-2 text-xs font-medium text-amber-800 hover:underline"
                onClick={() => setValidationMessage("")}
              >
                Cerrar
              </button>
            </div>
          )}

          <input
            className="w-full border rounded-lg p-3"
            placeholder="Nombre del paciente"
            value={appointment.paciente_nombre}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                paciente_nombre: e.target.value,
              })
            }
          />

          <select
            className="w-full border rounded-lg p-3"
            value={appointment.tipo_consulta}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                tipo_consulta: e.target.value,
              })
            }
          >
            <option value="Primera cita">Primera cita</option>
            <option value="Seguimiento">Seguimiento</option>
            <option value="Control">Control</option>
            <option value="Emergencia">Emergencia</option>
          </select>

          <input
            className="w-full border rounded-lg p-3"
            type="date"
            value={appointment.fecha}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                fecha: e.target.value,
              })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="w-full border rounded-lg p-3"
              value={appointment.hora_inicio}
              onChange={(e) =>
                setAppointment({
                  ...appointment,
                  hora_inicio: e.target.value,
                })
              }
            >
              <option value="">Hora inicio</option>
              {horarios.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded-lg p-3"
              value={appointment.hora_fin}
              onChange={(e) =>
                setAppointment({
                  ...appointment,
                  hora_fin: e.target.value,
                })
              }
            >
              <option value="">Hora fin</option>
              {horarios.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>
          </div>

          <select
            className="w-full border rounded-lg p-3"
            value={appointment.estado}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                estado: e.target.value,
              })
            }
          >
            <option value="programada">Programada</option>
            <option value="confirmada">Confirmada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <input
            className="w-full border rounded-lg p-3"
            type="number"
            min="0"
            placeholder="Monto en colones"
            value={appointment.monto || ""}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                monto: Number(e.target.value),
              })
            }
          />

          <textarea
            className="w-full border rounded-lg p-3 min-h-[90px]"
            placeholder="Notas de la cita"
            value={appointment.notas}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                notas: e.target.value,
              })
            }
          />

          <div className="flex justify-between gap-2 pt-2">
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>

              <Button type="button" onClick={onSubmit} disabled={disabled}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  submitText
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ apt, getBadgeClass, onEdit, onForms }: any) {
  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-5 p-5 text-left">
        <div className="text-center w-20 rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-bold text-gray-900">{apt.hora_inicio}</p>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{apt.paciente_nombre}</h4>
          <p className="text-sm text-gray-500">{apt.tipo_consulta}</p>
          {Number(apt.monto) > 0 && (
            <p className="text-sm text-gray-500">Monto: {formatCurrency(apt.monto)}</p>
          )}
          {apt.notas && <p className="text-sm text-gray-400 mt-1">{apt.notas}</p>}
        </div>

        <Badge className={getBadgeClass(apt.estado)}>{apt.estado}</Badge>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onForms}
          className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
        >
          Formularios
        </button>
      </div>
    </div>
  );
}

function WeekView({
  weekDays,
  obtenerHorariosLaborales,
  obtenerCitaEnHorario,
  onEdit,
  onForms,
  onCreateAppointment,
  getAppointmentSlotClass,
  showAllAvailability,
}: any) {
  const horariosLaborales = obtenerHorariosLaborales();

  const LIMITE_DISPONIBLES = showAllAvailability
    ? horariosLaborales.length
    : 3;

  return (
    <div className="w-full max-h-[520px] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
        {weekDays.map((day: Date) => {
          const ocupadosSlots = horariosLaborales
            .map((hora: string) => obtenerCitaEnHorario(day, hora))
            .filter(Boolean);

          const libres = horariosLaborales.filter(
            (hora: string) => !obtenerCitaEnHorario(day, hora)
          );

          const libresVisibles = libres.slice(0, LIMITE_DISPONIBLES);

          return (
            <div
              key={day.toISOString()}
              className="border border-gray-100 rounded-xl p-4 min-h-[320px] bg-white"
            >
              <div className="mb-4">
                <p className="text-xs text-gray-400 capitalize">
                  {day.toLocaleDateString("es-ES", { weekday: "short" })}
                </p>

                <p className="font-bold text-gray-900">{day.getDate()}</p>

                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5">
                    {libres.length} libres
                  </span>

                  <span className="rounded-full bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5">
                    {ocupadosSlots.length} ocupados
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {ocupadosSlots.map((cita: any) => (
                  <div key={cita.id} className={getAppointmentSlotClass(cita.estado)}>
                    <div
                      className="cursor-pointer"
                      onClick={() => onEdit(cita)}
                    >
                      <p className="text-xs font-bold">{cita.hora_inicio}</p>
                      <p className="text-xs">{cita.paciente_nombre}</p>
                      <p className="text-[11px] opacity-70">
                        {cita.tipo_consulta}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onForms(cita)}
                      className="mt-2 w-full rounded-lg border border-primary bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      Formularios
                    </button>
                  </div>
                ))}

                {libresVisibles.map((hora: string) => (
                  <button
                    type="button"
                    key={`${day.toISOString()}-${hora}`}
                    onClick={() => onCreateAppointment(day, hora)}
                    className="w-full text-left rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <span className="font-semibold">{hora}</span>
                    <div>Disponible</div>
                  </button>
                ))}

                {libres.length > LIMITE_DISPONIBLES && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 text-center">
                    +{libres.length - LIMITE_DISPONIBLES} espacios disponibles más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function MonthView({ appointments, month, obtenerFechaCita, getBadgeClass, onEdit, onForms }: any) {
  const monthAppointments = appointments
    .filter((apt: any) => {
      const fechaCita = obtenerFechaCita(apt.fecha);
      return (
        fechaCita.getMonth() === month.getMonth() &&
        fechaCita.getFullYear() === month.getFullYear()
      );
    })
    .sort((a: any, b: any) => {
      const fechaA = obtenerFechaCita(a.fecha).getTime();
      const fechaB = obtenerFechaCita(b.fecha).getTime();

      if (fechaA !== fechaB) return fechaA - fechaB;

      return String(a.hora_inicio).localeCompare(String(b.hora_inicio));
    });

  if (monthAppointments.length === 0) return <EmptyMonthState />;

  return (
    <div className="space-y-4">
      {monthAppointments.map((apt: any, idx: number) => {
        const fechaCita = obtenerFechaCita(apt.fecha);

        return (
          <div
            key={apt.id || idx}
            className="w-full rounded-xl border border-gray-100 bg-white"
          >
            <div
              className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-gray-50"
              onClick={() => onEdit(apt)}
            >
              <div className="text-center w-20">
                <p className="text-xs text-gray-400 capitalize">
                  {fechaCita.toLocaleDateString("es-ES", { weekday: "short" })}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {fechaCita.getDate()}
                </p>
              </div>

              <div className="text-center w-16">
                <p className="text-sm font-bold text-gray-900">
                  {apt.hora_inicio}
                </p>
              </div>

              <div className="flex-1">
                <h4 className="font-semibold">{apt.paciente_nombre}</h4>
                <p className="text-xs text-gray-500">{apt.tipo_consulta}</p>

                {Number(apt.monto) > 0 && (
                  <p className="text-xs text-gray-500">
                    Monto: {formatCurrency(apt.monto)}
                  </p>
                )}

                {apt.notas && (
                  <p className="text-xs text-gray-400 mt-1">{apt.notas}</p>
                )}
              </div>

              <Badge className={getBadgeClass(apt.estado)}>
                {apt.estado}
              </Badge>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => onForms(apt)}
                className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Formularios
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <CalendarIcon className="w-16 h-16 text-gray-100 mb-4" />
      <h3 className="text-xl font-bold text-gray-300">Sin citas este día</h3>
      <p className="text-gray-400 mt-2 max-w-xs">
        No hay consultas programadas para esta fecha en su base de datos.
      </p>
    </div>
  );
}

function EmptyMonthState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <CalendarIcon className="w-16 h-16 text-gray-100 mb-4" />
      <h3 className="text-xl font-bold text-gray-300">Sin citas este mes</h3>
      <p className="text-gray-400 mt-2 max-w-xs">
        No hay consultas programadas para este mes.
      </p>
    </div>
  );
}