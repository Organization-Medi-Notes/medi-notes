"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, ArrowLeft, Loader2, User, ClipboardList,
  Calendar, CheckCircle, CalendarDays, Clock
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
}

interface Stats {
  totalConsultas: number;
  totalCitas: number;
  porcentajeAsistencia: string;
  primeraConsulta: any;
  ultimaConsulta: any;
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

export default function ExpedienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Traer paciente
        const pacienteSnap = await getDoc(doc(db, "pacientes", id));
        if (!pacienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        const p = { id: pacienteSnap.id, ...pacienteSnap.data() } as Paciente;
        setPaciente(p);

        // 2. Traer consultas y citas en paralelo
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => router.push("/expedientes")}
          >
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

      {/* Tags */}
      {paciente.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paciente.tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 bg-violet-50 text-violet-700 text-xs rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Resumen estadístico */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Resumen estadístico
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
            value={String(stats?.totalConsultas ?? 0)}
            label="Total consultas"
            color="bg-blue-50"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-violet-600" />}
            value={String(stats?.totalCitas ?? 0)}
            label="Total citas"
            color="bg-violet-50"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            value={stats?.porcentajeAsistencia ?? "Sin datos"}
            label="% Asistencia"
            color="bg-emerald-50"
          />
          <StatCard
            icon={<CalendarDays className="w-5 h-5 text-orange-600" />}
            value={stats?.primeraConsulta ? formatFecha(stats.primeraConsulta) : "Sin datos"}
            label="Primera consulta"
            color="bg-orange-50"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-rose-600" />}
            value={stats?.ultimaConsulta ? formatFecha(stats.ultimaConsulta) : "Sin datos"}
            label="Última consulta"
            color="bg-rose-50"
          />
        </div>
      </div>

    </div>
  );
}