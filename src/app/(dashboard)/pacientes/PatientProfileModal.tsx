"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface PatientProfileModalProps {
  patient: any | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Consulta {
  id: string;
  fecha: any;
  motivoConsulta: string;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || "—"}</span>
    </div>
  );
}

function TagList({ label, items }: { label: string; items?: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-gray-400">—</span>
      )}
    </div>
  );
}

function formatFecha(fecha: any): string {
  if (!fecha) return "—";
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function PatientProfileModal({ patient, isOpen, onClose }: PatientProfileModalProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);

  useEffect(() => {
    if (!patient?.id || !isOpen) return;

    const fetchConsultas = async () => {
      setLoadingConsultas(true);
      try {
        const q = query(
          collection(db, "consultas"),
          where("pacienteId", "==", patient.id),
          orderBy("fecha", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Consulta[];
        setConsultas(data);
      } catch (error) {
        console.error("Error cargando consultas:", error);
        setConsultas([]);
      } finally {
        setLoadingConsultas(false);
      }
    };

    fetchConsultas();
  }, [patient?.id, isOpen]);

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {patient.nombre} {patient.apellidos}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Información general</TabsTrigger>
            <TabsTrigger value="historial">Historial de consultas</TabsTrigger>
          </TabsList>

          {/* PESTAÑA 1 — Información general */}
          <TabsContent value="info" className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Datos personales</p>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Nombre" value={patient.nombre} />
                <InfoRow label="Apellidos" value={patient.apellidos} />
                <InfoRow label="Cédula" value={patient.cedula} />
                <InfoRow label="Fecha de nacimiento" value={formatFecha(patient.fechaNacimiento)} />
                <InfoRow label="Sexo" value={patient.sexo} />
                <InfoRow label="Grupo sanguíneo" value={patient.grupoSanguineo} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contacto</p>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Teléfono" value={patient.telefono} />
                <InfoRow label="Email" value={patient.email} />
                <InfoRow label="Dirección" value={patient.direccion} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contacto de emergencia</p>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Nombre" value={patient.contactoEmergenciaNombre} />
                <InfoRow label="Teléfono" value={patient.contactoEmergenciaTelefono} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Información médica</p>
              <div className="space-y-4">
                <TagList label="Alergias" items={patient.alergias} />
                <TagList label="Medicamentos actuales" items={patient.medicamentosActuales} />
                <InfoRow label="Antecedentes familiares" value={patient.antecedentesFamiliares} />
                <InfoRow label="Antecedentes personales" value={patient.antecedentesPersonales} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Seguro</p>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Aseguradora" value={patient.aseguradora} />
                <InfoRow label="Número de póliza" value={patient.numeroPoliza} />
              </div>
            </div>
          </TabsContent>

          {/* PESTAÑA 2 — Historial de consultas */}
          <TabsContent value="historial">
            {loadingConsultas ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Cargando historial...</p>
              </div>
            ) : consultas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <FileText className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Este paciente no tiene consultas anteriores registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {consultas.map((c) => (
                  <div key={c.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="min-w-[120px]">
                      <span className="text-xs text-gray-400 block">Fecha</span>
                      <span className="text-sm font-medium text-gray-700">{formatFecha(c.fecha)}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-gray-400 block">Motivo</span>
                      <span className="text-sm text-gray-800">{c.motivoConsulta || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}