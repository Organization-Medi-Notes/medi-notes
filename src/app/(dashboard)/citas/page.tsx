"use client";

import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appointmentService } from "@/lib/firebase/db-service";

type AppointmentForm = {
  paciente_nombre: string;
  paciente_correo: string;
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
  paciente_correo: "",
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

function abrirCorreoNotificacionCita(appointment: AppointmentForm) {
  const correoGuardado = appointment.paciente_correo || "";

  const correoDestino = window.prompt(
    "¿A qué correo desea enviar la notificación de la cita?",
    correoGuardado
  );

  if (!correoDestino?.trim()) return;

  const asunto = "Confirmación de cita médica";
  const cuerpo = `Hola ${appointment.paciente_nombre},

Le confirmamos su cita médica para el día ${appointment.fecha} a las ${appointment.hora_inicio}.

Tipo de consulta: ${appointment.tipo_consulta}

Saludos.`;

const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
  correoDestino.trim()
)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

window.open(gmailUrl, "_blank");
  
}

export default function AppointmentsPage() {
  const [validationMessage, setValidationMessage] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("todos");

  const [openNewAppointment, setOpenNewAppointment] = useState(false);
  const [openEditAppointment, setOpenEditAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);

  const [newAppointment, setNewAppointment] =
    useState<AppointmentForm>(emptyAppointment);
  const [editAppointment, setEditAppointment] =
    useState<AppointmentForm>(emptyAppointment);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

  function formatDate(fecha: any) {
    return obtenerFechaCita(fecha).toLocaleDateString("es-CR");
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

    return cn(
      "capitalize px-2.5 py-0.5 text-[10px]",
      estadoNormalizado === "completada" &&
        "bg-emerald-50 text-emerald-700 border-emerald-100",
      estadoNormalizado === "confirmada" &&
        "bg-blue-50 text-blue-700 border-blue-100",
      estadoNormalizado === "programada" &&
        "bg-amber-50 text-amber-700 border-amber-100",
      estadoNormalizado === "cancelada" &&
        "bg-red-50 text-red-700 border-red-100"
    );
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

      await appointmentService.create({
        ...newAppointment,
        fecha: crearFechaLocal(newAppointment.fecha),
      });

      await loadData();

      setValidationMessage("");
      setOpenNewAppointment(false);

      abrirCorreoNotificacionCita(newAppointment);

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
    setActionsOpenId(null);
    setValidationMessage("");

    setEditAppointment({
      paciente_nombre: apt.paciente_nombre || "",
      paciente_correo: apt.paciente_correo || apt.correo || apt.email || "",
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

      await appointmentService.update(selectedAppointment.id, {
        ...editAppointment,
        fecha: crearFechaLocal(editAppointment.fecha),
      });

      await loadData();

      setValidationMessage("");
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

  async function handleCancelAppointment(apt: any) {
    try {
      setSaving(true);
      setActionsOpenId(null);

      await appointmentService.update(apt.id, {
        ...apt,
        estado: "cancelada",
      });

      await loadData();
    } catch (error) {
      console.error("Error cancelando cita:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAppointment(apt: any) {
  try {
    setSaving(true);
    setActionsOpenId(null);

    await appointmentService.delete(apt.id);

    await loadData();
  } catch (error) {
    console.error("Error eliminando cita:", error);
    setValidationMessage("No se pudo eliminar la cita. Intente nuevamente.");
  } finally {
    setSaving(false);
  }
}

  const filtered = appointments.filter((a) => {
    const matchesSearch = a.paciente_nombre
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesEstado =
      estadoFilter === "todos" || normalizarEstado(a.estado) === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <CalendarCheck className="text-primary" />
            Gestión de Citas
          </h1>
          <p className="text-gray-500 mt-1">
            Vea y administre el flujo de pacientes de su consultorio.
          </p>
        </div>

        <Button
          className="bg-primary hover:bg-primary-dark h-11"
          onClick={() => {
            setValidationMessage("");
            setOpenNewAppointment(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva cita
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
        />
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por paciente..."
            className="pl-10 h-11 border-gray-200 focus:ring-primary rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg z-20 p-2">
              {["todos", "programada", "confirmada", "completada", "cancelada"].map(
                (estado) => (
                  <button
                    key={estado}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm capitalize hover:bg-gray-50",
                      estadoFilter === estado && "bg-gray-100 font-semibold"
                    )}
                    onClick={() => {
                      setEstadoFilter(estado);
                      setFilterOpen(false);
                    }}
                  >
                    {estado}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card-notion p-0 overflow-visible min-h-[600px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-gray-400">Sincronizando agenda...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <CalendarCheck className="w-12 h-12 mb-2 opacity-20" />
            <p>No se encontraron citas registradas.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="py-4 text-center">Paciente</TableHead>
                <TableHead className="py-4 text-center">Fecha</TableHead>
                <TableHead className="py-4 text-center">Hora de inicio</TableHead>
                <TableHead className="py-4 text-center">Tipo</TableHead>
                <TableHead className="py-4 text-center">Estado</TableHead>
                <TableHead className="py-4 text-center">Monto</TableHead>
                <TableHead className="w-10 text-center"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((apt) => (
                <TableRow key={apt.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-semibold text-center">
                    {apt.paciente_nombre}
                  </TableCell>

                  <TableCell className="text-center">
                    {formatDate(apt.fecha)}
                  </TableCell>

                  <TableCell className="font-medium text-center">
                    {apt.hora_inicio}
                  </TableCell>

                  <TableCell className="text-center">
                    {apt.tipo_consulta}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Badge className={getBadgeClass(apt.estado)}>
                        {apt.estado}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="text-center font-medium">
                    {Number(apt.monto) > 0
                      ? formatCurrency(apt.monto)
                      : "N/A"}
                  </TableCell>

                  <TableCell className="relative text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mx-auto"
                      onClick={() =>
                        setActionsOpenId(
                          actionsOpenId === apt.id ? null : apt.id
                        )
                      }
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </Button>

                    {actionsOpenId === apt.id && (
                      <div className="absolute right-8 bottom-8 w-44 rounded-xl border bg-white shadow-xl z-50 p-2">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                          onClick={() => handleOpenEditAppointment(apt)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                          onClick={() => {
                            setActionsOpenId(null);
                            abrirCorreoNotificacionCita({
                              paciente_nombre: apt.paciente_nombre || "",
                              paciente_correo: apt.paciente_correo || apt.correo || apt.email || "",
                              tipo_consulta: apt.tipo_consulta || "Consulta",
                              fecha: formatInputDate(apt.fecha),
                              hora_inicio: apt.hora_inicio || "",
                              hora_fin: apt.hora_fin || "",
                              estado: apt.estado || "programada",
                              monto: Number(apt.monto || 0),
                              notas: apt.notas || "",
                            });
                          }}
                        >
                          Enviar correo
                        </button>

                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteAppointment(apt)}
                        >
                          Eliminar cita
                        </button>

                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                          onClick={() => handleCancelAppointment(apt)}
                        >
                          Cancelar cita
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {validationMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="font-semibold text-amber-900">Aviso</p>

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

          <Input
            placeholder="Nombre del paciente"
            value={appointment.paciente_nombre}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                paciente_nombre: e.target.value,
              })
            }
          />

          <Input
            type="email"
            placeholder="Correo del paciente"
            value={appointment.paciente_correo}
            onChange={(e) =>
              setAppointment({
                ...appointment,
                paciente_correo: e.target.value,
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

          <Input
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

          <Input
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

          <div className="flex justify-end gap-2 pt-2">
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
  );
}