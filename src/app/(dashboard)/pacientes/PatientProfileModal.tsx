"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, FileText, Calendar, Upload, ExternalLink, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";

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

interface Cita {
  id: string;
  fecha: any;
  motivo: string;
  estado: string;
}

interface Documento {
  nombre: string;
  url: string;
  fechaSubida: any;
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

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    completada:   "bg-emerald-50 text-emerald-700",
    cancelada:    "bg-rose-50 text-rose-700",
    "no-asistio": "bg-yellow-50 text-yellow-700",
    programada:   "bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    completada:   "Completada",
    cancelada:    "Cancelada",
    "no-asistio": "No asistió",
    programada:   "Programada",
  };
  const style = styles[estado] ?? "bg-gray-100 text-gray-500";
  const label = labels[estado] ?? estado;
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${style}`}>
      {label}
    </span>
  );
}

export function PatientProfileModal({ patient, isOpen, onClose }: PatientProfileModalProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!patient?.id || !isOpen) return;

    // Cargar documentos desde el objeto patient
    setDocumentos(patient.documentos || []);

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

    const fetchCitas = async () => {
      setLoadingCitas(true);
      try {
        const q = query(
          collection(db, "citas"),
          where("pacienteId", "==", patient.id),
          orderBy("fecha", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Cita[];
        setCitas(data);
      } catch (error) {
        console.error("Error cargando citas:", error);
        setCitas([]);
      } finally {
        setLoadingCitas(false);
      }
    };

    fetchConsultas();
    fetchCitas();
  }, [patient?.id, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient?.id) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Solo se permiten archivos PDF, JPG o PNG.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Subir a Firebase Storage
      const storageRef = ref(storage, `pacientes/${patient.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Guardar referencia en Firestore
      const nuevoDoc: Documento = {
        nombre: file.name,
        url,
        fechaSubida: Timestamp.now(),
      };

      const pacienteRef = doc(db, "pacientes", patient.id);
      await updateDoc(pacienteRef, {
        documentos: arrayUnion(nuevoDoc),
      });

      // Actualizar lista local
      setDocumentos(prev => [...prev, nuevoDoc]);
      setUploadSuccess(true);

      // Limpiar input
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error("Error subiendo archivo:", error);
      setUploadError("Ocurrió un error al subir el archivo. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

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
            <TabsTrigger value="citas">Citas anteriores</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          {/* PESTAÑA 1 — Información general — sin tocar */}
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

          {/* PESTAÑA 2 — Historial de consultas — sin tocar */}
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

          {/* PESTAÑA 3 — Citas anteriores — sin tocar */}
          <TabsContent value="citas">
            {loadingCitas ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Cargando citas...</p>
              </div>
            ) : citas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Calendar className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Este paciente no tiene citas anteriores registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {citas.map((c) => (
                  <div key={c.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="min-w-[120px]">
                      <span className="text-xs text-gray-400 block">Fecha</span>
                      <span className="text-sm font-medium text-gray-700">{formatFecha(c.fecha)}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-gray-400 block">Motivo</span>
                      <span className="text-sm text-gray-800">{c.motivo || "—"}</span>
                    </div>
                    <div className="min-w-[100px] flex justify-end">
                      <EstadoBadge estado={c.estado} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PESTAÑA 4 — Documentos — nuevo */}
          <TabsContent value="documentos" className="space-y-4">

            {/* Zona de subida */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-gray-50/50">
              <Upload className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500 text-center">
                Subí un archivo PDF o imagen para asociarlo a este paciente
              </p>
              <p className="text-xs text-gray-400">Formatos aceptados: PDF, JPG, PNG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                className="h-9 mt-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar archivo
                  </>
                )}
              </Button>

              {uploadSuccess && (
                <p className="text-sm text-emerald-600 font-medium">
                  Archivo subido correctamente.
                </p>
              )}
              {uploadError && (
                <p className="text-sm text-rose-600">
                  {uploadError}
                </p>
              )}
            </div>

            {/* Lista de documentos */}
            {documentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <Paperclip className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Este paciente no tiene documentos adjuntos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                    <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.nombre}</p>
                      <p className="text-xs text-gray-400">{formatFecha(d.fechaSubida)}</p>
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}