"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, FileText, Calendar, Upload, ExternalLink, Paperclip, ClipboardList, Eye, X, Plus, Download, Image } from "lucide-react";
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
import { collection, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
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
  motivo: string;
  estado: string;
}

interface Documento {
  nombre: string;
  url: string;
  fechaSubida: any;
}

interface NuevaConsultaForm {
  motivoConsulta: string;
  examenFisico: string;
  diagnostico: string;
  tratamiento: string;
  indicaciones: string;
  notasClinicas: string;
}

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

// ── Punto de color para la línea de tiempo ──
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
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NuevaConsultaForm>(FORM_INICIAL);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaSuccess, setConsultaSuccess] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaValidationError, setConsultaValidationError] = useState<string | null>(null);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<Consulta | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  const [exportingPdf, setExportingPdf] = useState(false);

  // Estado filtro timeline
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("todo");

  useEffect(() => {
    if (!patient?.id || !isOpen) return;

    setDocumentos(patient.documentos || []);

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
  }, [patient?.id, isOpen]);

  // ── Timeline events combinados y ordenados ──
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [
      ...consultas.map(c => ({ id: c.id, tipo: "consulta" as const, fecha: c.fecha, data: c })),
      ...citas.map(c => ({ id: c.id, tipo: "cita" as const, fecha: c.fecha, data: c })),
      ...documentos.map((d, i) => ({ id: `doc-${i}`, tipo: "documento" as const, fecha: d.fechaSubida, data: d })),
    ];
    return events.sort((a, b) => getFechaMs(b.fecha) - getFechaMs(a.fecha));
  }, [consultas, citas, documentos]);

  const filteredEvents = useMemo(() => {
    if (timelineFilter === "todo") return allEvents;
    return allEvents.filter(e => e.tipo === timelineFilter);
  }, [allEvents, timelineFilter]);

  // ── Exportar PDF ──
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
          const ml = pdf.splitTextToSize(`Motivo: ${c.motivo || "—"}`, contentW - 4);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient?.id) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) { setUploadError("Solo se permiten archivos PDF, JPG o PNG."); return; }
    setUploading(true); setUploadError(null); setUploadSuccess(false);
    try {
      const storageRef = ref(storage, `pacientes/${patient.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const nuevoDoc: Documento = { nombre: file.name, url, fechaSubida: Timestamp.now() };
      const pacienteRef = doc(db, "pacientes", patient.id);
      await updateDoc(pacienteRef, { documentos: arrayUnion(nuevoDoc) });
      setDocumentos(prev => [...prev, nuevoDoc]);
      setUploadSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error("Error subiendo archivo:", error);
      setUploadError("Ocurrió un error al subir el archivo. Intentá de nuevo.");
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <TabsList className="mb-4">
              <TabsTrigger value="info">Información general</TabsTrigger>
              <TabsTrigger value="historial">Consultas</TabsTrigger>
              <TabsTrigger value="citas">Citas</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="nueva-consulta">Nueva consulta</TabsTrigger>
              <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
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
                        <span className="text-xs text-gray-400 block">Motivo</span>
                        <span className="text-sm text-gray-800">{c.motivo || "—"}</span>
                      </div>
                      <div className="min-w-[100px] flex justify-end"><EstadoBadge estado={c.estado} /></div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PESTAÑA 4 — Documentos — sin tocar */}
            <TabsContent value="documentos" className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-gray-50/50">
                <Upload className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500 text-center">Subí un archivo PDF o imagen para asociarlo a este paciente</p>
                <p className="text-xs text-gray-400">Formatos aceptados: PDF, JPG, PNG</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <Button variant="outline" className="h-9 mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</> : <><Upload className="w-4 h-4 mr-2" />Seleccionar archivo</>}
                </Button>
                {uploadSuccess && <p className="text-sm text-emerald-600 font-medium">Archivo subido correctamente.</p>}
                {uploadError && <p className="text-sm text-rose-600">{uploadError}</p>}
              </div>
              {documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Paperclip className="w-8 h-8 mb-2 opacity-20" /><p className="text-sm">Este paciente no tiene documentos adjuntos.</p>
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
                      <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 shrink-0" onClick={() => window.open(d.url, "_blank")}>
                        <ExternalLink className="w-4 h-4 mr-1" />Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PESTAÑA 5 — Nueva consulta — sin tocar */}
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

            {/* PESTAÑA 6 — Línea de tiempo — nuevo */}
            <TabsContent value="timeline" className="space-y-4">

              {/* Filtros */}
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

              {/* Contador */}
              <p className="text-xs text-gray-400">
                {filteredEvents.length} {filteredEvents.length === 1 ? "evento registrado" : "eventos registrados"}
              </p>

              {/* Lista de eventos */}
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
                  {/* Línea vertical */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" />

                  <div className="space-y-4 pl-6">
                    {filteredEvents.map((event) => (
                      <div key={`${event.tipo}-${event.id}`} className="relative flex gap-3">
                        {/* Punto de color */}
                        <div className="absolute -left-6 top-1.5">
                          <TimelineDot tipo={event.tipo} estado={event.tipo === "cita" ? event.data.estado : undefined} />
                        </div>

                        {/* Tarjeta del evento */}
                        <div className="flex-1 p-4 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2">

                          {/* Header del evento */}
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
                              <p className="text-sm font-medium text-gray-800">{event.data.motivo || "—"}</p>
                            </div>
                          )}

                          {event.tipo === "documento" && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {/\.(jpg|jpeg|png|gif|webp)$/i.test(event.data.nombre)
                                  ? <Image className="w-4 h-4 text-violet-400 shrink-0" />
                                  : <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                                }
                                <p className="text-sm font-medium text-gray-800 truncate">{event.data.nombre}</p>
                              </div>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs text-blue-600 hover:text-blue-700 shrink-0 px-2"
                                onClick={() => window.open(event.data.url, "_blank")}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />Abrir
                              </Button>
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
    </>
  );
}