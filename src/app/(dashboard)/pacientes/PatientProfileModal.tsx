"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, FileText, Calendar, Upload, ExternalLink, Paperclip, ClipboardList, Eye, X, Plus, Download, Image, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";
import { printFormularioClinico } from "@/lib/formulario-print";
import { FormulariosPaciente } from "./components/FormulariosPaciente";
import { VerFormularioModal } from "./components/VerFormularioModal";
import jsPDF from "jspdf";

interface PatientProfileModalProps {
  patient: any | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Consulta {
  id: string;
  fecha: any;
  motivoConsulta: string;
  examenFisico: string;
  diagnostico: string[];
  tratamiento: string;
  indicaciones: string;
  notasClinicas: string;
}

interface Cita {
  id: string;
  fecha: any;
  notas: string;
  estado: string;
}

interface Documento {
  id?: string;
  nombre: string;
  url: string;
  tipo: "pdf" | "imagen";
  tamaño: number;
  creado_en: any;
}

interface NuevaConsultaForm {
  motivoConsulta: string;
  examenFisico: string;
  diagnostico: string;
  tratamiento: string;
  indicaciones: string;
  notasClinicas: string;
}

type FormResponseValue = string | boolean | string[];

type FormResponseEstado = "draft" | "completed";

type TimelineFilter = "todo" | "consulta" | "cita" | "documento";

interface TimelineEvent {
  id: string;
  tipo: "consulta" | "cita" | "documento";
  fecha: any;
  data: any;
}

const FORM_INICIAL: NuevaConsultaForm = {
  motivoConsulta: "",
  examenFisico: "",
  diagnostico: "",
  tratamiento: "",
  indicaciones: "",
  notasClinicas: "",
};

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

function formatTamaño(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function FormField({ label, required, value, onChange, placeholder }: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className="resize-none min-h-[80px] text-sm border-gray-200 focus:ring-primary rounded-lg"
      />
    </div>
  );
}

function ConsultaDetalleModal({ consulta, onClose }: { consulta: Consulta; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Detalle de consulta — {formatFecha(consulta.fecha)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Información clínica
            </p>
            <div className="space-y-4">
              <InfoRow label="Motivo de consulta" value={consulta.motivoConsulta} />
              <InfoRow label="Examen físico" value={consulta.examenFisico} />
              <InfoRow label="Tratamiento" value={consulta.tratamiento} />
              <InfoRow label="Indicaciones" value={consulta.indicaciones} />
              <InfoRow label="Notas clínicas" value={consulta.notasClinicas} />
            </div>
          </div>
          {consulta.diagnostico && consulta.diagnostico.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Diagnóstico
              </p>
              <div className="flex flex-wrap gap-1.5">
                {consulta.diagnostico.map((d, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="outline" className="h-9" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  return <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${color}`} />;
}

export function PatientProfileModal({ patient, isOpen, onClose }: PatientProfileModalProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);

  // ── Estado documentos — reemplazado para Cloudinary ──
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NuevaConsultaForm>(FORM_INICIAL);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaSuccess, setConsultaSuccess] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaValidationError, setConsultaValidationError] = useState<string | null>(null);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<Consulta | null>(null);

  const [formularios, setFormularios] = useState<FormularioClinico[]>([]);
  const [loadingFormularios, setLoadingFormularios] = useState(false);
  const [patientResponses, setPatientResponses] = useState<FormularioClinicoRespuesta[]>([]);
  const [selectedFormulario, setSelectedFormulario] = useState<FormularioClinico | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<FormularioClinicoRespuesta | null>(null);
  const [responseValues, setResponseValues] = useState<Record<string, FormResponseValue>>({});
  const [responseStatus, setResponseStatus] = useState<FormResponseEstado>("draft");
  const [savingResponse, setSavingResponse] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseValidationError, setResponseValidationError] = useState<string | null>(null);
  const [openViewResponseModal, setOpenViewResponseModal] = useState(false);
  const [viewingResponse, setViewingResponse] = useState<FormularioClinicoRespuesta | null>(null);
  const [viewingFormulario, setViewingFormulario] = useState<FormularioClinico | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("todo");

  // ── Cargar documentos desde Firestore ──
  const fetchDocumentos = async (pacienteId: string) => {
    setLoadingDocumentos(true);
    try {
      const q = query(
        collection(db, "documentos"),
        where("pacienteId", "==", pacienteId),
        orderBy("creado_en", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Documento[];
      setDocumentos(data);
    } catch (error) {
      console.error("Error cargando documentos:", error);
      setDocumentos([]);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  const fetchFormularios = async () => {
    setLoadingFormularios(true);
    try {
      const activeForms = await formularioService.getAll();
      setFormularios(activeForms);
    } catch (error) {
      console.error("Error cargando formularios clínicos:", error);
      setFormularios([]);
    } finally {
      setLoadingFormularios(false);
    }
  };

  const fetchPatientResponses = async (pacienteId: string) => {
    try {
      const responses = await formularioService.getPatientResponses(pacienteId);
      setPatientResponses(responses);
    } catch (error) {
      console.error("Error cargando respuestas de formularios para el paciente:", error);
      setPatientResponses([]);
    }
  };

  const buildResponseValues = (
    formulario: FormularioClinico,
    response?: FormularioClinicoRespuesta
  ): Record<string, FormResponseValue> => {
    const values: Record<string, FormResponseValue> = {};
    formulario.campos.forEach((campo) => {
      const existing = response?.respuestas?.[campo.id];
      if (existing !== undefined) {
        values[campo.id] = existing as FormResponseValue;
        return;
      }

      switch (campo.tipo) {
        case "checkbox":
          values[campo.id] = false;
          break;
        case "multiselect":
          values[campo.id] = [];
          break;
        default:
          values[campo.id] = "";
      }
    });
    return values;
  };

  const handleSelectFormulario = (formulario: FormularioClinico) => {
    const existing = patientResponses.find((response) => response.formularioId === formulario.id);
    setSelectedFormulario(formulario);
    setSelectedResponse(existing || null);
    setResponseValues(buildResponseValues(formulario, existing || undefined));
    setResponseStatus(existing?.estado ?? "draft");
    setResponseError(null);
    setResponseSuccess(null);
    setResponseValidationError(null);
  };

  const handleEditDraftFromList = (formularioId: string) => {
    const formulario = formularios.find((item) => item.id === formularioId);
    if (formulario) {
      handleSelectFormulario(formulario);
    }
  };

  const handleViewResponseInDocuments = async (response: FormularioClinicoRespuesta) => {
    try {
      const form = await formularioService.getById(response.formularioId);
      setViewingFormulario(form);
      setViewingResponse(response);
      setOpenViewResponseModal(true);
    } catch (error) {
      console.error("Error cargando formulario para visualización:", error);
    }
  };

  const handleResponseFieldChange = (campoId: string, value: FormResponseValue) => {
    setResponseValues((prev) => ({
      ...prev,
      [campoId]: value,
    }));
  };

  const handleSaveResponse = async (status: FormResponseEstado) => {
    if (!patient?.id || !selectedFormulario) return;
    setResponseValidationError(null);
    setResponseError(null);
    setResponseSuccess(null);

    const requiredMissing = selectedFormulario.campos.some((campo) => {
      if (!campo.requerido) return false;
      const value = responseValues[campo.id];
      if (campo.tipo === "checkbox") return value !== true;
      if (campo.tipo === "multiselect") return Array.isArray(value) && value.length === 0;
      return value === "" || value === undefined || value === null;
    });

    if (requiredMissing) {
      setResponseValidationError("Por favor complete todos los campos obligatorios antes de guardar.");
      return;
    }

    setSavingResponse(true);
    try {
      const payload = {
        pacienteId: patient.id,
        formularioId: selectedFormulario.id ?? "",
        formularioNombre: selectedFormulario.nombre,
        formularioEspecialidad: selectedFormulario.especialidad,
        formularioVersion: selectedFormulario.version,
        doctorId: auth.currentUser?.uid ?? "",
        estado: status,
        respuestas: responseValues,
      };

      if (selectedResponse?.id) {
        await formularioService.updatePatientResponse(selectedResponse.id, {
          respuestas: responseValues,
          estado: status,
        });
        setResponseSuccess("Respuesta actualizada correctamente.");
      } else {
        await formularioService.savePatientResponse(payload);
        setResponseSuccess("Respuesta guardada correctamente.");
      }

      await fetchPatientResponses(patient.id);
      const savedResponse = await formularioService.getPatientResponse(patient.id, selectedFormulario.id ?? "");
      setSelectedResponse(savedResponse);
      setResponseStatus(status);
    } catch (error) {
      console.error("Error guardando respuesta del formulario:", error);
      setResponseError("No se pudo guardar la respuesta. Intentá de nuevo.");
    } finally {
      setSavingResponse(false);
    }
  };

  useEffect(() => {
    if (!patient?.id || !isOpen) return;

    const fetchPatientData = async () => {
      try {
        const pacienteSnap = await getDoc(doc(db, "pacientes", patient.id));
        if (pacienteSnap.exists()) {
          setTags(pacienteSnap.data()?.tags || []);
        }
      } catch (error) {
        console.error("Error cargando datos del paciente:", error);
        setTags(patient.tags || []);
      }
    };

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

    fetchPatientData();
    fetchConsultas();
    fetchCitas();
    fetchDocumentos(patient.id);
    fetchFormularios();
    fetchPatientResponses(patient.id);
    setSelectedFormulario(null);
    setSelectedResponse(null);
    setResponseValues({});
    setResponseStatus("draft");
    setResponseError(null);
    setResponseSuccess(null);
    setResponseValidationError(null);
  }, [patient?.id, isOpen]);

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [
      ...consultas.map(c => ({ id: c.id, tipo: "consulta" as const, fecha: c.fecha, data: c })),
      ...citas.map(c => ({ id: c.id, tipo: "cita" as const, fecha: c.fecha, data: c })),
      ...documentos.map((d) => ({ id: d.id ?? d.nombre, tipo: "documento" as const, fecha: d.creado_en, data: d })),
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

  // ── Seleccionar archivo ──
  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Solo se permiten archivos PDF, JPG o PNG.");
      return;
    }
    setArchivoSeleccionado(file);
    setUploadError(null);
    setUploadSuccess(false);
  };

  // ── Subir a Cloudinary y guardar en Firestore ──
  const handleSubirDocumento = async () => {
    if (!archivoSeleccionado || !patient?.id) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    try {
      // Simular progreso mientras sube
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", archivoSeleccionado);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) throw new Error("Error al subir a Cloudinary");

      const data = await response.json();
      const url = data.secure_url;

      await addDoc(collection(db, "documentos"), {
        pacienteId: patient.id,
        doctorId: auth.currentUser?.uid ?? "",
        nombre: archivoSeleccionado.name,
        tipo: archivoSeleccionado.type.includes("pdf") ? "pdf" : "imagen",
        url,
        tamaño: archivoSeleccionado.size,
        creado_en: Timestamp.now(),
      });

      setUploadSuccess(true);
      setArchivoSeleccionado(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocumentos(patient.id);
      setTimeout(() => { setUploadSuccess(false); setUploadProgress(0); }, 3000);

    } catch (error) {
      console.error("Error subiendo archivo:", error);
      setUploadError("Ocurrió un error al subir el archivo. Intentá de nuevo.");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleGuardarConsulta = async () => {
    setConsultaValidationError(null); setConsultaError(null); setConsultaSuccess(false);
    if (!form.motivoConsulta.trim()) { setConsultaValidationError("El motivo de consulta es obligatorio."); return; }
    setSavingConsulta(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "consultas"), {
        pacienteId: patient.id, doctorId: "", citaId: "", fecha: now, fechaCreacion: now,
        motivoConsulta: form.motivoConsulta.trim(), examenFisico: form.examenFisico.trim(),
        diagnostico: form.diagnostico.trim() ? [form.diagnostico.trim()] : [],
        tratamiento: form.tratamiento.trim(), indicaciones: form.indicaciones.trim(),
        notasClinicas: form.notasClinicas.trim(), resumenIA: "",
      });
      setForm(FORM_INICIAL); setConsultaSuccess(true);
      setTimeout(() => setConsultaSuccess(false), 3000);
      const q = query(collection(db, "consultas"), where("pacienteId", "==", patient.id), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      setConsultas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Consulta[]);
    } catch (error) {
      console.error("Error guardando consulta:", error);
      setConsultaError("Ocurrió un error al guardar la consulta. Intentá de nuevo.");
    } finally {
      setSavingConsulta(false);
    }
  };

  const handleAddTag = async () => {
    const nuevoTag = tagInput.trim();
    if (!nuevoTag) return;
    if (tags.includes(nuevoTag)) { setTagInput(""); return; }
    if (tags.length >= 20) return;
    setSavingTag(true);
    try {
      await updateDoc(doc(db, "pacientes", patient.id), { tags: arrayUnion(nuevoTag) });
      setTags(prev => [...prev, nuevoTag]); setTagInput("");
    } catch (error) { console.error("Error agregando tag:", error); }
    finally { setSavingTag(false); }
  };

  const handleRemoveTag = async (tag: string) => {
    setSavingTag(true);
    try {
      await updateDoc(doc(db, "pacientes", patient.id), { tags: arrayRemove(tag) });
      setTags(prev => prev.filter(t => t !== tag));
    } catch (error) { console.error("Error eliminando tag:", error); }
    finally { setSavingTag(false); }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
  };

  const handleExportPdf = async () => {
    if (!patient) return;
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentW = pageW - margin * 2;
      let y = margin;

      const checkPage = (needed: number = 10) => {
        if (y + needed > pageH - margin) { pdf.addPage(); y = margin; }
      };
      const addSubtitle = (text: string) => {
        checkPage(10);
        pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(80, 80, 80);
        pdf.text(text.toUpperCase(), margin, y); y += 1;
        pdf.setDrawColor(200, 200, 220); pdf.line(margin, y, margin + contentW, y); y += 5;
      };
      const addField = (label: string, value: string) => {
        checkPage(7);
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(100, 100, 100);
        pdf.text(`${label}:`, margin, y);
        const labelW = pdf.getTextWidth(`${label}: `);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(40, 40, 40);
        const valueLines = pdf.splitTextToSize(value || "—", contentW - labelW);
        pdf.text(valueLines, margin + labelW, y);
        y += valueLines.length * 5 + 1;
      };
      const addText = (text: string) => {
        const lines = pdf.splitTextToSize(text, contentW);
        checkPage(lines.length * 5 + 2);
        pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.setTextColor(40, 40, 40);
        pdf.text(lines, margin, y); y += lines.length * 5 + 1;
      };
      const addSpacer = (h = 5) => { y += h; };

      pdf.setFontSize(20); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 58, 95);
      pdf.text(`${patient.nombre} ${patient.apellidos}`, margin, y); y += 8;
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 130, 130);
      pdf.text(`Ficha generada el ${new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
      y += 10;

      addSubtitle("Datos personales");
      addField("Cédula", patient.cedula); addField("Fecha de nacimiento", formatFecha(patient.fechaNacimiento));
      addField("Sexo", patient.sexo); addField("Grupo sanguíneo", patient.grupoSanguineo); addSpacer();

      addSubtitle("Contacto");
      addField("Teléfono", patient.telefono); addField("Email", patient.email); addField("Dirección", patient.direccion); addSpacer();

      addSubtitle("Contacto de emergencia");
      addField("Nombre", patient.contactoEmergenciaNombre); addField("Teléfono", patient.contactoEmergenciaTelefono); addSpacer();

      addSubtitle("Información médica");
      addField("Alergias", patient.alergias?.length > 0 ? patient.alergias.join(", ") : "—");
      addField("Medicamentos actuales", patient.medicamentosActuales?.length > 0 ? patient.medicamentosActuales.join(", ") : "—");
      addField("Antecedentes familiares", patient.antecedentesFamiliares);
      addField("Antecedentes personales", patient.antecedentesPersonales); addSpacer();

      addSubtitle("Seguro");
      addField("Aseguradora", patient.aseguradora); addField("Número de póliza", patient.numeroPoliza); addSpacer();

      addSubtitle("Etiquetas");
      addText(tags.length > 0 ? tags.join("  ·  ") : "—"); addSpacer();

      addSubtitle("Historial de consultas");
      if (consultas.length === 0) {
        addText("Sin consultas registradas");
      } else {
        consultas.forEach((c, i) => {
          checkPage(14);
          pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
          pdf.text(`${i + 1}. ${formatFecha(c.fecha)}`, margin, y); y += 5;
          const campos = [
            { label: "Motivo", value: c.motivoConsulta },
            { label: "Examen físico", value: c.examenFisico },
            { label: "Diagnóstico", value: c.diagnostico?.length > 0 ? c.diagnostico.join(", ") : undefined },
            { label: "Tratamiento", value: c.tratamiento },
            { label: "Indicaciones", value: c.indicaciones },
            { label: "Notas clínicas", value: c.notasClinicas },
          ];
          campos.forEach(({ label, value }) => {
            const lw = pdf.getTextWidth(`${label}: `);
            const vl = pdf.splitTextToSize(value || "—", contentW - 4 - lw);
            checkPage(vl.length * 5 + 2);
            pdf.setFont("helvetica", "bold"); pdf.setTextColor(100, 100, 100);
            pdf.text(`${label}:`, margin + 4, y);
            pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
            pdf.text(vl, margin + 4 + lw, y); y += vl.length * 5 + 1;
          });
          y += 4;
        });
      }
      addSpacer();

      addSubtitle("Citas anteriores");
      if (citas.length === 0) {
        addText("Sin citas registradas");
      } else {
        const estadoLabels: Record<string, string> = { completada: "Completada", cancelada: "Cancelada", "no-asistio": "No asistió", programada: "Programada" };
        citas.forEach((c, i) => {
          checkPage(12);
          pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
          pdf.text(`${i + 1}. ${formatFecha(c.fecha)}  —  ${estadoLabels[c.estado] ?? c.estado}`, margin, y); y += 5;
          pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
          const ml = pdf.splitTextToSize(`Notas: ${c.notas || "—"}`, contentW - 4);
          checkPage(ml.length * 5 + 3); pdf.text(ml, margin + 4, y); y += ml.length * 5 + 3;
        });
      }

      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i); pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(180, 180, 180);
        pdf.text(`Medi Notes  ·  Página ${i} de ${totalPages}`, margin, pageH - 8);
      }

      const nombreArchivo = `ficha-${patient.nombre}-${patient.apellidos}`.replace(/\s+/g, "-").toLowerCase();
      pdf.save(`${nombreArchivo}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setExportingPdf(false);
    }
  };

  if (!patient) return null;
  const isLoading = loadingConsultas || loadingCitas;

  const filterButtons: { key: TimelineFilter; label: string }[] = [
    { key: "todo", label: "Todo" },
    { key: "consulta", label: "Consultas" },
    { key: "cita", label: "Citas" },
    { key: "documento", label: "Documentos" },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="w-[96vw] max-w-[1280px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {patient.nombre} {patient.apellidos}
            </DialogTitle>
            <Button
              variant="outline" size="sm" className="h-8 text-gray-600 shrink-0"
              onClick={handleExportPdf} disabled={exportingPdf || isLoading}
            >
              {exportingPdf ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generando...</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1.5" />Exportar PDF</>
              )}
            </Button>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="mb-4 flex w-full flex-nowrap items-center justify-start gap-1 overflow-hidden bg-transparent p-0">
              <TabsTrigger value="info" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Información general</TabsTrigger>
              <TabsTrigger value="historial" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Consultas</TabsTrigger>
              <TabsTrigger value="citas" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Citas</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Documentos</TabsTrigger>
              <TabsTrigger value="formularios" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Formularios</TabsTrigger>
              <TabsTrigger value="nueva-consulta" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Nueva consulta</TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 min-w-0 px-2 text-xs sm:text-sm">Línea de tiempo</TabsTrigger>
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
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Etiquetas
                  {tags.length > 0 && <span className="ml-2 text-gray-400 font-normal normal-case">({tags.length}/20)</span>}
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full font-medium">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} disabled={savingTag} className="hover:text-violet-900 transition-colors ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {tags.length < 20 && (
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                      placeholder="Escribí una etiqueta y presioná Enter"
                      className="h-9 text-sm border-gray-200 focus:ring-primary rounded-lg" disabled={savingTag} />
                    <Button variant="outline" className="h-9 shrink-0" onClick={handleAddTag} disabled={savingTag || !tagInput.trim()}>
                      {savingTag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                {tags.length === 0 && !savingTag && <p className="text-xs text-gray-400 mt-1">No hay etiquetas asignadas todavía.</p>}
              </div>
            </TabsContent>

            {/* PESTAÑA 2 — Historial de consultas — sin tocar */}
            <TabsContent value="historial">
              {loadingConsultas ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" /><p className="text-sm">Cargando historial...</p>
                </div>
              ) : consultas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <FileText className="w-10 h-10 mb-2 opacity-20" /><p className="text-sm">Este paciente no tiene consultas anteriores registradas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {consultas.map((c) => (
                    <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-blue-50/40 hover:border-blue-100 transition-colors" onClick={() => setConsultaSeleccionada(c)}>
                      <div className="min-w-[120px]">
                        <span className="text-xs text-gray-400 block">Fecha</span>
                        <span className="text-sm font-medium text-gray-700">{formatFecha(c.fecha)}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-400 block">Motivo</span>
                        <span className="text-sm text-gray-800">{c.motivoConsulta || "—"}</span>
                      </div>
                      <Eye className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PESTAÑA 3 — Citas anteriores — sin tocar */}
            <TabsContent value="citas">
              {loadingCitas ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" /><p className="text-sm">Cargando citas...</p>
                </div>
              ) : citas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Calendar className="w-10 h-10 mb-2 opacity-20" /><p className="text-sm">Este paciente no tiene citas anteriores registradas.</p>
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
                        <span className="text-xs text-gray-400 block">Notas de la cita</span>
                        <span className="text-sm text-gray-800">{c.notas || "—"}</span>
                      </div>
                      <div className="min-w-[100px] flex justify-end"><EstadoBadge estado={c.estado} /></div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PESTAÑA 4 — Documentos — reemplazado con Cloudinary */}
            <TabsContent value="documentos" className="space-y-4">

              {/* Área de carga */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-gray-50/50">
                <Upload className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500 text-center">Subí un archivo PDF o imagen para asociarlo a este paciente</p>
                <p className="text-xs text-gray-400">Formatos aceptados: PDF, JPG, PNG</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleSeleccionarArchivo}
                  disabled={uploading}
                />

                <Button
                  variant="outline"
                  className="h-9 mt-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Seleccionar archivo
                </Button>

                {/* Archivo seleccionado */}
                {archivoSeleccionado && !uploading && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg w-full max-w-sm">
                    {archivoSeleccionado.type.includes("pdf")
                      ? <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      : <Image className="w-4 h-4 text-blue-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{archivoSeleccionado.name}</p>
                      <p className="text-xs text-gray-400">{formatTamaño(archivoSeleccionado.size)}</p>
                    </div>
                    <button onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Barra de progreso */}
                {uploading && (
                  <div className="w-full max-w-sm space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Subiendo... {uploadProgress}%</p>
                  </div>
                )}

                {/* Botón subir */}
                {archivoSeleccionado && !uploading && (
                  <Button className="h-9 bg-primary hover:bg-primary-dark" onClick={handleSubirDocumento}>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir documento
                  </Button>
                )}

                {uploadSuccess && <p className="text-sm text-emerald-600 font-medium">Archivo subido correctamente.</p>}
                {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
              </div>

              {/* Lista de documentos */}
              {loadingDocumentos ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-sm">Cargando documentos...</p>
                </div>
              ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Paperclip className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No hay documentos adjuntos para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((d) => (
                    <div key={d.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
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
                        variant="ghost" size="sm"
                        className="h-8 text-blue-600 hover:text-blue-700 shrink-0"
                        onClick={() => window.open(d.url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Formularios del paciente (como documentos clínicos)</p>
                {patientResponses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-400 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                    <FileText className="w-6 h-6 mb-1 opacity-30" />
                    <p className="text-sm">No hay formularios registrados para este paciente.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {patientResponses
                      .slice()
                      .sort((a, b) => getFechaMs(b.modificado_en ?? b.creado_en) - getFechaMs(a.modificado_en ?? a.creado_en))
                      .map((response) => (
                        <div key={response.id ?? response.formularioId} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50/50">
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
                            onClick={() => handleViewResponseInDocuments(response)}
                          >
                            <Eye className="w-4 h-4 mr-1" />Ver respuestas
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PESTAÑA 5 — Formularios clínicos del paciente */}
            <TabsContent value="formularios" className="space-y-6">
              <FormulariosPaciente
                pacienteId={patient.id}
                patientName={`${patient.nombre} ${patient.apellidos}`}
                onEditDraft={handleEditDraftFromList}
              />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Formularios clínicos</p>
                  <p className="text-sm text-gray-500 mt-1">Asocie y complete formularios clínicos a este paciente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    Formularios activos: {formularios.length}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    Respuestas guardadas: {patientResponses.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Seleccionar formulario</p>
                    {loadingFormularios ? (
                      <div className="flex items-center justify-center h-24 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Cargando formularios...
                      </div>
                    ) : formularios.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay formularios clínicos disponibles.</p>
                    ) : (
                      <div className="space-y-2">
                        {formularios.map((formulario) => {
                          const existing = patientResponses.find((response) => response.formularioId === formulario.id);
                          return (
                            <button
                              key={formulario.id}
                              type="button"
                              onClick={() => handleSelectFormulario(formulario)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                                selectedFormulario?.id === formulario.id
                                  ? "border-primary bg-primary/10"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-900">{formulario.nombre}</span>
                                {existing && (
                                  <span className="text-[11px] rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                    {existing.estado === "completed" ? "Completado" : "Borrador"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{formulario.descripcion || "Sin descripción"}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedResponse && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Última respuesta</p>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center justify-between gap-2">
                          <span>Estado</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{selectedResponse.estado}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>Guardado</span>
                          <span className="text-slate-500 text-xs">{formatFecha(selectedResponse.creado_en)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  {selectedFormulario ? (
                    <>
                      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{selectedFormulario.nombre}</h3>
                          <p className="text-sm text-gray-500">{selectedFormulario.descripcion || "Complete los campos para este paciente."}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              printFormularioClinico({
                                formulario: selectedFormulario,
                                patientName: patient ? `${patient.nombre} ${patient.apellidos}` : undefined,
                                response: {
                                  respuestas: responseValues,
                                  estado: responseStatus,
                                  doctorId: auth.currentUser?.uid,
                                  fecha: new Date(),
                                },
                              })
                            }
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                          </Button>
                          <Button
                            size="sm"
                            variant={responseStatus === "draft" ? "default" : "outline"}
                            onClick={() => setResponseStatus("draft")}
                          >
                            Guardar borrador
                          </Button>
                          <Button
                            size="sm"
                            variant={responseStatus === "completed" ? "default" : "outline"}
                            onClick={() => setResponseStatus("completed")}
                          >
                            Marcar completado
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedFormulario.campos
                          .sort((a, b) => a.orden - b.orden)
                          .map((campo) => {
                            const value = responseValues[campo.id];
                            const required = campo.requerido;

                            if (campo.tipo === "textarea") {
                              return (
                                <div key={campo.id} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {campo.etiqueta}
                                    {required && <span className="text-rose-500">*</span>}
                                  </label>
                                  <Textarea
                                    value={String(value ?? "")}
                                    onChange={(e) => handleResponseFieldChange(campo.id, e.target.value)}
                                    placeholder={campo.placeholder}
                                    className="min-h-[120px] border-gray-200 focus:ring-primary rounded-lg"
                                  />
                                </div>
                              );
                            }

                            if (campo.tipo === "select" || campo.tipo === "number" || campo.tipo === "date" || campo.tipo === "text" || campo.tipo === "diagnostico" || campo.tipo === "medicamento") {
                              return (
                                <div key={campo.id} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {campo.etiqueta}
                                    {required && <span className="text-rose-500">*</span>}
                                  </label>
                                  {campo.tipo === "select" ? (
                                    <Select
                                      value={String(value ?? "")}
                                      onValueChange={(val) => handleResponseFieldChange(campo.id, val)}
                                    >
                                      <SelectTrigger className="border-gray-200 rounded-lg h-11">
                                        <SelectValue placeholder={campo.placeholder || "Seleccione una opción"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {campo.opciones.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type={campo.tipo === "number" ? "number" : campo.tipo === "date" ? "date" : "text"}
                                      value={String(value ?? "")}
                                      onChange={(e) => handleResponseFieldChange(campo.id, campo.tipo === "number" ? Number(e.target.value) : e.target.value)}
                                      placeholder={campo.placeholder}
                                      className="border-gray-200 focus:ring-primary rounded-lg h-11"
                                    />
                                  )}
                                </div>
                              );
                            }

                            if (campo.tipo === "checkbox") {
                              return (
                                <label key={campo.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                  <Checkbox
                                    checked={Boolean(value)}
                                    onCheckedChange={(checked) => handleResponseFieldChange(campo.id, Boolean(checked))}
                                  />
                                  <span>{campo.etiqueta}</span>
                                </label>
                              );
                            }

                            if (campo.tipo === "multiselect") {
                              const selectedValues = Array.isArray(value) ? value : [];
                              return (
                                <div key={campo.id} className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700">{campo.etiqueta}{required && <span className="text-rose-500">*</span>}</p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {campo.opciones.map((option) => (
                                      <label key={option} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <Checkbox
                                          checked={selectedValues.includes(option)}
                                          onCheckedChange={(checked) => {
                                            const nextValues = checked
                                              ? [...selectedValues, option]
                                              : selectedValues.filter((item) => item !== option);
                                            handleResponseFieldChange(campo.id, nextValues);
                                          }}
                                        />
                                        {option}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })}
                      </div>

                      {responseValidationError && <p className="text-sm text-rose-600">{responseValidationError}</p>}
                      {responseError && <p className="text-sm text-rose-600">{responseError}</p>}
                      {responseSuccess && <p className="text-sm text-emerald-600">{responseSuccess}</p>}

                      <div className="flex flex-wrap gap-2 justify-end mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveResponse("draft")}
                          disabled={savingResponse}
                        >
                          {savingResponse ? "Guardando..." : "Guardar borrador"}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary-dark"
                          onClick={() => handleSaveResponse("completed")}
                          disabled={savingResponse}
                        >
                          {savingResponse ? "Guardando..." : "Guardar y completar"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Seleccione un formulario clínico para comenzar a registrar la información del paciente.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* PESTAÑA 6 — Nueva consulta — sin tocar */}
            <TabsContent value="nueva-consulta" className="space-y-4">
              <div className="space-y-4">
                <FormField label="Motivo de consulta" required value={form.motivoConsulta} onChange={(val) => setForm(prev => ({ ...prev, motivoConsulta: val }))} placeholder="Describí el motivo principal de la consulta" />
                <FormField label="Examen físico" value={form.examenFisico} onChange={(val) => setForm(prev => ({ ...prev, examenFisico: val }))} placeholder="Hallazgos del examen físico" />
                <FormField label="Diagnóstico" value={form.diagnostico} onChange={(val) => setForm(prev => ({ ...prev, diagnostico: val }))} placeholder="Diagnóstico del paciente" />
                <FormField label="Tratamiento" value={form.tratamiento} onChange={(val) => setForm(prev => ({ ...prev, tratamiento: val }))} placeholder="Tratamiento indicado" />
                <FormField label="Indicaciones" value={form.indicaciones} onChange={(val) => setForm(prev => ({ ...prev, indicaciones: val }))} placeholder="Indicaciones para el paciente" />
                <FormField label="Notas clínicas / observaciones" value={form.notasClinicas} onChange={(val) => setForm(prev => ({ ...prev, notasClinicas: val }))} placeholder="Notas adicionales de la consulta" />
              </div>
              {consultaValidationError && <p className="text-sm text-rose-600">{consultaValidationError}</p>}
              {consultaError && <p className="text-sm text-rose-600">{consultaError}</p>}
              {consultaSuccess && <p className="text-sm text-emerald-600 font-medium">Consulta guardada correctamente.</p>}
              <div className="flex justify-end pt-2">
                <Button className="h-10 bg-primary hover:bg-primary-dark" onClick={handleGuardarConsulta} disabled={savingConsulta}>
                  {savingConsulta ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><ClipboardList className="w-4 h-4 mr-2" />Guardar consulta</>}
                </Button>
              </div>
            </TabsContent>

            {/* PESTAÑA 6 — Línea de tiempo — sin tocar */}
            <TabsContent value="timeline" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
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
              <p className="text-xs text-gray-400">
                {filteredEvents.length} {filteredEvents.length === 1 ? "evento registrado" : "eventos registrados"}
              </p>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-sm">Cargando eventos...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Calendar className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No hay eventos registrados para este paciente.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" />
                  <div className="space-y-4 pl-6">
                    {filteredEvents.map((event) => (
                      <div key={`${event.tipo}-${event.id}`} className="relative flex gap-3">
                        <div className="absolute -left-6 top-1.5">
                          <TimelineDot tipo={event.tipo} estado={event.tipo === "cita" ? event.data.estado : undefined} />
                        </div>
                        <div className="flex-1 p-4 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2">
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
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2 -ml-2"
                                onClick={() => setConsultaSeleccionada(event.data)}
                              >
                                <Eye className="w-3 h-3 mr-1" />Ver detalle
                              </Button>
                            </div>
                          )}
                          {event.tipo === "cita" && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-800">{event.data.notas || "—"}</p>
                            </div>
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
                                <p className="text-sm font-medium text-gray-800 truncate">{event.data.nombre}</p>
                              </div>
                              {event.data.subtipo === "formulario" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-blue-600 hover:text-blue-700 shrink-0 px-2"
                                  onClick={() => handleViewResponseInDocuments(event.data)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />Ver respuestas
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {consultaSeleccionada && (
        <ConsultaDetalleModal
          consulta={consultaSeleccionada}
          onClose={() => setConsultaSeleccionada(null)}
        />
      )}

      <VerFormularioModal
        open={openViewResponseModal}
        onOpenChange={(open) => {
          setOpenViewResponseModal(open);
          if (!open) {
            setViewingResponse(null);
            setViewingFormulario(null);
          }
        }}
        formulario={viewingFormulario}
        response={viewingResponse}
        patientName={`${patient?.nombre ?? ""} ${patient?.apellidos ?? ""}`.trim()}
      />
    </>
  );
}