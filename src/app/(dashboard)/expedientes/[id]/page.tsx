"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, User, ClipboardList,
  Calendar, CheckCircle, CalendarDays, Clock,
  AlertTriangle, Pill, BookOpen, ShieldAlert, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  collection, getDocs, query, where, orderBy, getDoc, doc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
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

export default function ExpedienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [diagnosticosFrecuentes, setDiagnosticosFrecuentes] = useState<DiagnosticoFrecuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

        const [consultasSnap, citasSnap, primeraConsultaSnap] = await Promise.all([
          getDocs(query(collection(db, "consultas"), where("pacienteId", "==", id), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "citas"), where("pacienteId", "==", id))),
          getDocs(query(collection(db, "consultas"), where("pacienteId", "==", id), orderBy("fecha", "asc"))),
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

        // Procesar diagnósticos frecuentes
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

      } catch (error) {
        console.error("Error cargando expediente:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

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

      {/* Diagnósticos más frecuentes — corregido sin barras */}
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

    </div>
  );
}