"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Filter, FileSearch, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";

interface PatientRecord {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: any;
  activo: boolean;
  tags: string[];
  totalConsultas: number;
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
  if (!fecha) return "Sin consultas";
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "Sin consultas";
  }
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      try {
        // 1. Traer todos los pacientes
        const pacientesSnap = await getDocs(collection(db, "pacientes"));
        const pacientes = pacientesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // 2. Para cada paciente traer sus consultas en paralelo
        const records = await Promise.all(
          pacientes.map(async (p) => {
            try {
              const q = query(
                collection(db, "consultas"),
                where("pacienteId", "==", p.id),
                orderBy("fecha", "desc"),
                limit(1)
              );
              const consultasSnap = await getDocs(q);

              // Total de consultas
              const totalQ = query(
                collection(db, "consultas"),
                where("pacienteId", "==", p.id)
              );
              const totalSnap = await getDocs(totalQ);

              return {
                id: p.id,
                nombre: p.nombre || "",
                apellidos: p.apellidos || "",
                fechaNacimiento: p.fechaNacimiento,
                activo: p.activo ?? true,
                tags: p.tags || [],
                totalConsultas: totalSnap.size,
                ultimaConsulta: consultasSnap.docs[0]?.data()?.fecha ?? null,
              } as PatientRecord;
            } catch {
              return {
                id: p.id,
                nombre: p.nombre || "",
                apellidos: p.apellidos || "",
                fechaNacimiento: p.fechaNacimiento,
                activo: p.activo ?? true,
                tags: p.tags || [],
                totalConsultas: 0,
                ultimaConsulta: null,
              } as PatientRecord;
            }
          })
        );

        setRecords(records);
      } catch (error) {
        console.error("Error cargando expedientes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, []);

  const filtered = records.filter(r =>
    `${r.nombre} ${r.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-primary" />
            Expedientes Clínicos
          </h1>
          <p className="text-gray-500 mt-1">Acceda al historial médico completo de sus pacientes.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre o apellidos..."
            className="pl-10 h-12 border-gray-200 focus:ring-primary rounded-lg text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 px-6">
          <Filter className="w-4 h-4 mr-2" />
          Filtros Avanzados
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-gray-400">Cargando expedientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <User className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-base">No hay expedientes registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((record) => {
            const edad = calcularEdad(record.fechaNacimiento);
            const tagsVisibles = record.tags.slice(0, 3);
            const tagsExtra = record.tags.length - 3;

            return (
              <div
                key={record.id}
                onClick={() => router.push(`/expedientes/${record.id}`)}
                className="card-notion group hover:border-primary/50 transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-primary-light transition-colors">
                    <FileText className="text-gray-400 group-hover:text-primary" />
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium border-transparent ${
                    record.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {record.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                {/* Nombre y edad */}
                <h3 className="font-bold text-lg text-gray-900 leading-tight">
                  {record.nombre} {record.apellidos}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {edad > 0 ? `${edad} años` : "Edad no registrada"}
                </p>

                {/* Tags */}
                {record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tagsVisibles.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                    {tagsExtra > 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                        +{tagsExtra} más
                      </span>
                    )}
                  </div>
                )}

                {/* Consultas y última consulta */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Consultas:</span>
                    <span className="text-xs font-semibold text-gray-700">{record.totalConsultas}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Última consulta:</span>
                    <span className="text-xs font-medium text-gray-600">
                      {record.ultimaConsulta ? formatFecha(record.ultimaConsulta) : "Sin consultas"}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-semibold text-primary">Ver Expediente Completo</span>
                  <FileSearch className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}