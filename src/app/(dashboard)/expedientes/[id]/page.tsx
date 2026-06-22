"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, User, ClipboardList,
  Calendar, CheckCircle, CalendarDays, Clock,
  AlertTriangle, Pill, BookOpen, ShieldAlert, BarChart2,
  Paperclip, FileText, Image, ExternalLink, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  collection, getDocs, query, where, orderBy, getDoc, doc, onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";
import { printFormularioClinico } from "@/lib/formulario-print";

interface Paciente {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: any;
  activo: boolean;
  tags: string[];
  alergias?: string[];
  medicamentosActuales?: string[];
  antecedentesFamiliares?: string;
  antecedentesPersonales?: string;
}

interface Stats {
  totalConsultas: number;
  totalCitas: number;
  porcentajeAsistencia: string;
  primeraConsulta: any;
  ultimaConsulta: any;
}

interface DiagnosticoFrecuente {
  nombre: string;
  cantidad: number;
}

interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo: "pdf" | "imagen";
  tamaño: number;
  creado_en: any;
}

interface Consulta {
  id: string;
  fecha: any;
  motivoConsulta: string;
  diagnostico: string[];
  notasClinicas: string;
}

interface Cita {
  id: string;
  fecha: any;
  motivo: string;
  estado: string;
}

type TimelineFilter = "todo" | "consulta" | "cita" | "documento";

interface TimelineEvent {
  id: string;
  tipo: "consulta" | "cita" | "documento";
  fecha: any;
  data: any;
}

function calcularEdad(fechaNacimiento: any): number {
  if (!fechaNacimiento) return 0;
  try {
    const date = fechaNacimiento?.toDate ? fechaNacimiento.toDate() : new Date(fechaNacimiento);
    return Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

function formatFecha(fecha: any): string {
  if (!fecha) return "—";
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatTamaño(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getFechaMs(fecha: any): number {
  if (!fecha) return 0;
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.getTime();
  } catch {
    return 0;
  }
}

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="card-notion flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
}

function AlertasMedicas({ paciente }: { paciente: Paciente }) {
  const alergias = paciente.alergias ?? [];
  const medicamentos = paciente.medicamentosActuales ?? [];
  const antFamiliares = paciente.antecedentesFamiliares ?? "";
  const antPersonales = paciente.antecedentesPersonales ?? "";

  const tieneAlgo = alergias.length > 0 || medicamentos.length > 0 || antFamiliares || antPersonales;
  if (!tieneAlgo) return null;

  const bannerClass = alergias.length > 0
    ? "bg-rose-50 border border-rose-200"
    : medicamentos.length > 0
      ? "bg-amber-50 border border-amber-200"
      : "bg-gray-50 border border-gray-200";

  return (
    <div className={`rounded-xl p-5 ${bannerClass}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
        <p className="text-sm font-bold text-rose-700 uppercase tracking-wide">
          Alertas médicas importantes
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-rose-200/60">
        <div className="pt-4 md:pt-0 md:pr-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Alergias {alergias.length > 0 && `(${alergias.length})`}
            </p>
          </div>
          {alergias.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {alergias.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full font-medium">{a}</span>
                ))}
              </div>
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Verificar antes de prescribir
              </p>
            </>
          ) : (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
              Sin alergias conocidas
            </span>
          )}
        </div>
        <div className="pt-4 md:pt-0 md:px-4 space-y-2">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Medicamentos {medicamentos.length > 0 && `(${medicamentos.length})`}
            </p>
          </div>
          {medicamentos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {medicamentos.map((m, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{m}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin medicamentos registrados</p>
          )}
        </div>
        <div className="pt-4 md:pt-0 md:pl-4 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Antecedentes</p>
          </div>
          {antFamiliares || antPersonales ? (
            <div className="space-y-2">
              {antFamiliares && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Familiares</p>
                  <p className="text-xs text-gray-700">{antFamiliares}</p>
                </div>
              )}
              {antPersonales && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Personales</p>
                  <p className="text-xs text-gray-700">{antPersonales}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin antecedentes registrados</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineDot({ tipo, estado }: { tipo: string; estado?: string }) {
  let color = "bg-blue-400";
  if (tipo === "documento") color = "bg-violet-400";
  else if (tipo === "cita") {
    if (estado === "completada") color = "bg-emerald-400";
    else if (estado === "cancelada" || estado === "no-asistio") color = "bg-rose-400";
    else color = "bg-yellow-400";
  }
  return <div className={`w-3 h-3 rounded-full shrink-0 ${color}`} />;
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    completada: "bg-emerald-50 text-emerald-700",
    cancelada: "bg-rose-50 text-rose-700",
    "no-asistio": "bg-yellow-50 text-yellow-700",
    programada: "bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    completada: "Completada",
    cancelada: "Cancelada",
    "no-asistio": "No asistió",
    programada: "Programada",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[estado] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

function FormularioHistoricoModal({
  open,
  onOpenChange,
  formulario,
  response,
  patientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulario: FormularioClinico | null;
  response: FormularioClinicoRespuesta | null;
  patientName: string;
}) {
  if (!response) return null;

  const statusClass =
    response.estado === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-amber-50 text-amber-700 border-amber-100";

  const sortedCampos = formulario?.campos?.slice().sort((a, b) => a.orden - b.orden) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>{response.formularioNombre}</DialogTitle>
              <DialogDescription>
                Historial clínico del paciente en modo solo lectura.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {formulario && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    printFormularioClinico({
                      formulario,
                      patientName,
                      response: {
                        respuestas: response.respuestas,
                        estado: response.estado,
                        doctorId: response.doctorId,
                        fecha: response.modificado_en ?? response.creado_en,
                      },
                    })
                  }
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              )}
              <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium border ${statusClass}`}>
                {response.estado === "completed" ? "Completado" : "Borrador"}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Paciente</p>
              <p className="font-medium text-gray-900">{patientName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p className="font-medium text-gray-900">{formatFecha(response.modificado_en ?? response.creado_en)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Doctor</p>
              <p className="font-medium text-gray-900">{response.doctorId || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Versión</p>
              <p className="font-medium text-gray-900">v{response.formularioVersion ?? "—"}</p>
            </div>
          </div>
        </div>

        {formulario ? (
          <div className="space-y-4 mt-2">
            {sortedCampos.map((campo) => {
              const value = response.respuestas?.[campo.id];

              return (
                <div key={campo.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {campo.etiqueta}
                    {campo.requerido && <span className="text-rose-500 ml-1">*</span>}
                  </p>

                  {campo.tipo === "textarea" ? (
                    <Textarea value={String(value ?? "")} readOnly className="min-h-[100px] border-gray-200 bg-gray-50" />
                  ) : campo.tipo === "checkbox" ? (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox checked={Boolean(value)} disabled />
                      <span>{campo.placeholder || "Seleccionado"}</span>
                    </label>
                  ) : campo.tipo === "multiselect" ? (
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(value) ? value : []).map((item: string) => (
                        <span key={item} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                          {item}
                        </span>
                      ))}
                      {(!Array.isArray(value) || value.length === 0) && (
                        <span className="text-sm text-gray-500">No hay respuestas.</span>
                      )}
                    </div>
                  ) : (
                    <Input
                      type={campo.tipo === "number" ? "number" : campo.tipo === "date" ? "date" : "text"}
                      value={String(value ?? "")}
                      readOnly
                      className="h-11 border-gray-200 bg-gray-50"
                      placeholder="Sin respuesta"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 mt-2">
            No se encontró la estructura completa del formulario. Se muestran datos de contexto del registro histórico.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ExpedienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [diagnosticosFrecuentes, setDiagnosticosFrecuentes] = useState<DiagnosticoFrecuente[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [patientResponses, setPatientResponses] = useState<FormularioClinicoRespuesta[]>([]);
  const [formsById, setFormsById] = useState<Record<string, FormularioClinico>>({});
  const [openViewResponseModal, setOpenViewResponseModal] = useState(false);
  const [viewingResponse, setViewingResponse] = useState<FormularioClinicoRespuesta | null>(null);
  const [loadingFormHistory, setLoadingFormHistory] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("todo");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoading(true);
      try {
        const pacienteSnap = await getDoc(doc(db, "pacientes", id));
        if (!pacienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        const p = { id: pacienteSnap.id, ...pacienteSnap.data() } as Paciente;
        setPaciente(p);

        const [consultasSnap, citasSnap, primeraConsultaSnap, documentosSnap] = await Promise.all([
          getDocs(query(collection(db, "consultas"), where("pacienteId", "==", id), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "citas"), where("pacienteId", "==", id))),
          getDocs(query(collection(db, "consultas"), where("pacienteId", "==", id), orderBy("fecha", "asc"))),
          getDocs(query(collection(db, "documentos"), where("pacienteId", "==", id), orderBy("creado_en", "desc"))),
        ]);

        const totalConsultas = consultasSnap.size;
        const totalCitas = citasSnap.size;
        const citasCompletadas = citasSnap.docs.filter(d => d.data().estado === "completada").length;
        const porcentajeAsistencia = totalCitas > 0
          ? `${((citasCompletadas / totalCitas) * 100).toFixed(1)}%`
          : "Sin datos";
        const ultimaConsulta = consultasSnap.docs[0]?.data()?.fecha ?? null;
        const primeraConsulta = primeraConsultaSnap.docs[0]?.data()?.fecha ?? null;

        setStats({ totalConsultas, totalCitas, porcentajeAsistencia, primeraConsulta, ultimaConsulta });

        // Diagnósticos frecuentes
        const todosLosDiagnosticos: string[] = consultasSnap.docs
          .map(d => d.data().diagnostico ?? [])
          .flat()
          .map((d: string) => d.trim().toLowerCase())
          .filter((d: string) => d.length > 0);

        const conteo = todosLosDiagnosticos.reduce((acc: Record<string, number>, d: string) => {
          acc[d] = (acc[d] ?? 0) + 1;
          return acc;
        }, {});

        const ordenados = Object.entries(conteo)
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5);

        setDiagnosticosFrecuentes(ordenados);

        // Documentos
        const docs = documentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Documento[];
        setDocumentos(docs);

        // Formularios del paciente se sincronizan en tiempo real en un listener dedicado.

        // Consultas para timeline
        const consultasData = consultasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Consulta[];
        setConsultas(consultasData);

        // Citas para timeline
        const citasData = citasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Cita[];
        setCitas(citasData);

      } catch (error) {
        console.error("Error cargando expediente:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, refreshTick]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setRefreshTick((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let currentPrimaryResponses: FormularioClinicoRespuesta[] = [];
    let currentAltResponses: FormularioClinicoRespuesta[] = [];
    let currentLegacyResponses: FormularioClinicoRespuesta[] = [];

    setLoadingFormHistory(true);

    const applyMergedResponses = async () => {
      const merged = [...currentPrimaryResponses, ...currentAltResponses, ...currentLegacyResponses];
      const uniqueMap = new Map<string, FormularioClinicoRespuesta>();

      merged.forEach((response) => {
        const key = response.id ?? `${response.formularioId}-${getFechaMs(response.modificado_en ?? response.creado_en)}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, response);
      });

      const sortedResponses = Array.from(uniqueMap.values()).sort(
        (a, b) => getFechaMs(b.modificado_en ?? b.creado_en) - getFechaMs(a.modificado_en ?? a.creado_en)
      );

      if (!active) return;
      setPatientResponses(sortedResponses);

      try {
        const uniqueFormIds = Array.from(new Set(sortedResponses.map((r) => r.formularioId).filter(Boolean)));
        const formDocs = await Promise.all(uniqueFormIds.map((formId) => formularioService.getById(formId)));
        const formMap: Record<string, FormularioClinico> = {};

        formDocs.forEach((formulario) => {
          if (formulario?.id) {
            formMap[formulario.id] = formulario;
          }
        });

        if (!active) return;
        setFormsById(formMap);
      } catch (error) {
        console.error("Error cargando estructura de formularios para expediente:", error);
      } finally {
        if (active) setLoadingFormHistory(false);
      }
    };

    const documentosQuery = query(
      collection(db, "documentos"),
      where("pacienteId", "==", id),
      orderBy("creado_en", "desc")
    );

    const responsesQuery = query(
      collection(db, "formularios_paciente"),
      where("pacienteId", "==", id)
    );

    const altResponsesQuery = query(
      collection(db, "formularios_paciente"),
      where("patientId", "==", id)
    );

    const legacyResponsesQuery = query(
      collection(db, "formularios_paciente"),
      where("paciente_id", "==", id)
    );

    const unsubDocumentos = onSnapshot(
      documentosQuery,
      (snapshot) => {
        if (!active) return;
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Documento[];
        setDocumentos(docs);
      },
      (error) => {
        console.error("Error escuchando documentos del expediente:", error);
      }
    );

    const unsubResponses = onSnapshot(
      responsesQuery,
      (snapshot) => {
        currentPrimaryResponses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FormularioClinicoRespuesta[];
        void applyMergedResponses();
      },
      (error) => {
        console.error("Error escuchando formularios del paciente (pacienteId):", error);
        setLoadingFormHistory(false);
      }
    );

    const unsubAltResponses = onSnapshot(
      altResponsesQuery,
      (snapshot) => {
        currentAltResponses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FormularioClinicoRespuesta[];
        void applyMergedResponses();
      },
      () => {
        // Consulta alternativa opcional para compatibilidad con datasets antiguos o migraciones parciales.
      }
    );

    const unsubLegacyResponses = onSnapshot(
      legacyResponsesQuery,
      (snapshot) => {
        currentLegacyResponses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FormularioClinicoRespuesta[];
        void applyMergedResponses();
      },
      () => {
        // Consulta legacy opcional para compatibilidad con datos antiguos.
      }
    );

    return () => {
      active = false;
      unsubDocumentos();
      unsubResponses();
      unsubAltResponses();
      unsubLegacyResponses();
    };
  }, [id]);

  // Timeline combinado y ordenado
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [
      ...consultas.map(c => ({ id: c.id, tipo: "consulta" as const, fecha: c.fecha, data: c })),
      ...citas.map(c => ({ id: c.id, tipo: "cita" as const, fecha: c.fecha, data: c })),
      ...documentos.map(d => ({ id: d.id, tipo: "documento" as const, fecha: d.creado_en, data: d })),
      ...patientResponses.map((response) => ({
        id: `form-${response.id ?? response.formularioId}`,
        tipo: "documento" as const,
        fecha: response.modificado_en ?? response.creado_en,
        data: {
          ...response,
          subtipo: "formulario",
          nombre: response.formularioNombre,
        },
      })),
    ];
    return events.sort((a, b) => getFechaMs(b.fecha) - getFechaMs(a.fecha));
  }, [consultas, citas, documentos, patientResponses]);

  const filteredEvents = useMemo(() => {
    if (timelineFilter === "todo") return allEvents;
    return allEvents.filter(e => e.tipo === timelineFilter);
  }, [allEvents, timelineFilter]);

  const formHistoryByTemplate = useMemo(() => {
    const groups = new Map<string, { latest: FormularioClinicoRespuesta; entries: FormularioClinicoRespuesta[] }>();

    patientResponses.forEach((response) => {
      const key = response.formularioId || response.formularioNombre;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, { latest: response, entries: [response] });
        return;
      }

      existing.entries.push(response);
      if (getFechaMs(response.modificado_en ?? response.creado_en) > getFechaMs(existing.latest.modificado_en ?? existing.latest.creado_en)) {
        existing.latest = response;
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        getFechaMs(b.latest.modificado_en ?? b.latest.creado_en) -
        getFechaMs(a.latest.modificado_en ?? a.latest.creado_en)
    );
  }, [patientResponses]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-400">Cargando expediente...</p>
      </div>
    );
  }

  if (notFound || !paciente) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
        <User className="w-14 h-14 opacity-20" />
        <p className="text-base">No se encontró el expediente del paciente.</p>
        <Button variant="outline" onClick={() => router.push("/expedientes")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a expedientes
        </Button>
      </div>
    );
  }

  const edad = calcularEdad(paciente.fechaNacimiento);

  const filterButtons: { key: TimelineFilter; label: string }[] = [
    { key: "todo", label: "Todo" },
    { key: "consulta", label: "Consultas" },
    { key: "cita", label: "Citas" },
    { key: "documento", label: "Documentos" },
  ];

  const selectedForm = viewingResponse?.formularioId ? formsById[viewingResponse.formularioId] ?? null : null;

  const handleViewResponse = (response: FormularioClinicoRespuesta) => {
    setViewingResponse(response);
    setOpenViewResponseModal(true);
  };

  return (
    <div className="space-y-8">

      {/* Header — sin tocar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="h-9" onClick={() => router.push("/expedientes")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-headline font-bold text-gray-900">
                {paciente.nombre} {paciente.apellidos}
              </h1>
              <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium ${
                paciente.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}>
                {paciente.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5">
              {edad > 0 ? `${edad} años` : "Edad no registrada"} · Expediente clínico
            </p>
          </div>
        </div>
      </div>

      {/* Tags — sin tocar */}
      {paciente.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paciente.tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 bg-violet-50 text-violet-700 text-xs rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Banner alertas médicas — sin tocar */}
      <AlertasMedicas paciente={paciente} />

      {/* Resumen estadístico — sin tocar */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Resumen estadístico
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={<ClipboardList className="w-5 h-5 text-blue-600" />} value={String(stats?.totalConsultas ?? 0)} label="Total consultas" color="bg-blue-50" />
          <StatCard icon={<Calendar className="w-5 h-5 text-violet-600" />} value={String(stats?.totalCitas ?? 0)} label="Total citas" color="bg-violet-50" />
          <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} value={stats?.porcentajeAsistencia ?? "Sin datos"} label="% Asistencia" color="bg-emerald-50" />
          <StatCard icon={<CalendarDays className="w-5 h-5 text-orange-600" />} value={stats?.primeraConsulta ? formatFecha(stats.primeraConsulta) : "Sin datos"} label="Primera consulta" color="bg-orange-50" />
          <StatCard icon={<Clock className="w-5 h-5 text-rose-600" />} value={stats?.ultimaConsulta ? formatFecha(stats.ultimaConsulta) : "Sin datos"} label="Última consulta" color="bg-rose-50" />
        </div>
      </div>

      {/* Diagnósticos más frecuentes — sin tocar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Diagnósticos más frecuentes
          </p>
        </div>
        <div className="card-notion space-y-2">
          {diagnosticosFrecuentes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No hay diagnósticos registrados para este paciente.
            </p>
          ) : (
            diagnosticosFrecuentes.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">{capitalize(d.nombre)}</span>
                </div>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium shrink-0 ml-4">
                  {d.cantidad} {d.cantidad === 1 ? "vez" : "veces"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Documentos — sin tocar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Documentos
          </p>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-50 text-violet-700">
            Formularios vinculados: {patientResponses.length}
          </span>
        </div>
        <div className="card-notion">
          {documentos.length === 0 && patientResponses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Este paciente no tiene documentos adjuntos.</p>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div key={d.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  {d.tipo === "pdf"
                    ? <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                    : <Image className="w-5 h-5 text-blue-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {formatTamaño(d.tamaño)} · {formatFecha(d.creado_en)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-600 hover:text-blue-700 shrink-0"
                    onClick={() => window.open(d.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Abrir
                  </Button>
                </div>
              ))}

              {patientResponses.map((response) => (
                <div key={response.id ?? response.formularioId} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  <FileText className="w-5 h-5 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{response.formularioNombre}</p>
                    <p className="text-xs text-gray-400">
                      {response.estado === "completed" ? "Completado" : "Borrador"} · {formatFecha(response.modificado_en ?? response.creado_en)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-600 hover:text-blue-700 shrink-0"
                    onClick={() => handleViewResponse(response)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver respuestas
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formularios históricos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Formularios históricos
          </p>
        </div>

        <div className="card-notion">
          {loadingFormHistory ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando historial de formularios...
            </div>
          ) : formHistoryByTemplate.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No hay formularios históricos para este paciente.
            </p>
          ) : (
            <div className="space-y-3">
              {formHistoryByTemplate.map((group, idx) => {
                const latest = group.latest;
                const statusClass =
                  latest.estado === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700";

                return (
                  <div key={`${latest.formularioId}-${idx}`} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{latest.formularioNombre}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Última actualización: {formatFecha(latest.modificado_en ?? latest.creado_en)} · v{latest.formularioVersion ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Registros históricos: {group.entries.length}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium ${statusClass}`}>
                          {latest.estado === "completed" ? "Completado" : "Borrador"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-blue-600 hover:text-blue-700"
                          onClick={() => handleViewResponse(latest)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ver respuestas
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.entries.slice(0, 3).map((entry) => (
                        <span key={entry.id ?? `${entry.formularioId}-${entry.creado_en}`} className="px-2 py-0.5 text-[10px] rounded-full bg-white border border-gray-200 text-gray-600">
                          {entry.estado === "completed" ? "Completado" : "Borrador"} · {formatFecha(entry.modificado_en ?? entry.creado_en)}
                        </span>
                      ))}
                      {group.entries.length > 3 && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-white border border-gray-200 text-gray-500">
                          +{group.entries.length - 3} registro(s) más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Línea de tiempo — nuevo */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Línea de tiempo
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-3">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimelineFilter(key)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                timelineFilter === key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contador */}
        <p className="text-xs text-gray-400 mb-4">
          {filteredEvents.length} {filteredEvents.length === 1 ? "evento registrado" : "eventos registrados"}
        </p>

        {/* Lista de eventos */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Calendar className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No hay eventos registrados para este paciente.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-4 pl-6">
              {filteredEvents.map((event) => (
                <div key={`${event.tipo}-${event.id}`} className="relative flex gap-3">
                  {/* Punto de color */}
                  <div className="absolute -left-6 top-1.5">
                    <TimelineDot tipo={event.tipo} estado={event.tipo === "cita" ? event.data.estado : undefined} />
                  </div>

                  {/* Tarjeta */}
                  <div className="flex-1 p-4 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2">

                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">{formatFecha(event.fecha)}</span>
                      <div className="flex items-center gap-2">
                        {event.tipo === "consulta" && (
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-50 text-blue-700">Consulta</span>
                        )}
                        {event.tipo === "cita" && (
                          <>
                            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-600">Cita</span>
                            <EstadoBadge estado={event.data.estado} />
                          </>
                        )}
                        {event.tipo === "documento" && (
                          <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-violet-50 text-violet-700">Documento</span>
                        )}
                      </div>
                    </div>

                    {/* Contenido según tipo */}
                    {event.tipo === "consulta" && (
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-800">{event.data.motivoConsulta || "—"}</p>
                        {event.data.diagnostico?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {event.data.diagnostico.map((d: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{d}</span>
                            ))}
                          </div>
                        )}
                        {event.data.notasClinicas && (
                          <p className="text-xs text-gray-500 line-clamp-2">{event.data.notasClinicas}</p>
                        )}
                      </div>
                    )}

                    {event.tipo === "cita" && (
                      <p className="text-sm font-medium text-gray-800">{event.data.motivo || "—"}</p>
                    )}

                    {event.tipo === "documento" && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {event.data.subtipo === "formulario" ? (
                            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                          ) : event.data.tipo === "imagen" ? (
                            <Image className="w-4 h-4 text-violet-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{event.data.nombre}</p>
                            <p className="text-xs text-gray-400">
                              {event.data.subtipo === "formulario"
                                ? event.data.estado === "completed"
                                  ? "Completado"
                                  : "Borrador"
                                : formatTamaño(event.data.tamaño)}
                            </p>
                          </div>
                        </div>
                        {event.data.subtipo === "formulario" ? (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 shrink-0 px-2"
                            onClick={() => handleViewResponse(event.data)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />Ver respuestas
                          </Button>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 shrink-0 px-2"
                            onClick={() => window.open(event.data.url, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />Abrir
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <FormularioHistoricoModal
        open={openViewResponseModal}
        onOpenChange={(open) => {
          setOpenViewResponseModal(open);
          if (!open) {
            setViewingResponse(null);
          }
        }}
        formulario={selectedForm}
        response={viewingResponse}
        patientName={`${paciente.nombre} ${paciente.apellidos}`}
      />

    </div>
  );
}