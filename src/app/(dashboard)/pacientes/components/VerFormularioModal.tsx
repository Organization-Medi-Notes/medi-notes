"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";

interface VerFormularioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulario: FormularioClinico | null;
  response: FormularioClinicoRespuesta | null;
  patientName: string;
}

function formatFecha(fecha: any): string {
  if (!fecha) return "-";
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function renderReadOnlyField(campo: FormularioClinico["campos"][number], value: any) {
  if (campo.tipo === "textarea") {
    return <Textarea value={String(value ?? "")} readOnly className="min-h-[110px] border-gray-200 bg-gray-50" />;
  }

  if (campo.tipo === "checkbox") {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <Checkbox checked={Boolean(value)} disabled />
        <span>{campo.placeholder || "Seleccionado"}</span>
      </label>
    );
  }

  if (campo.tipo === "multiselect") {
    const selectedValues = Array.isArray(value) ? value : [];

    if (selectedValues.length === 0) {
      return <p className="text-sm text-gray-500">No hay respuestas.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedValues.map((item: string) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {item}
          </span>
        ))}
      </div>
    );
  }

  if (campo.tipo === "select") {
    return (
      <Input
        value={String(value ?? "")}
        readOnly
        className="h-11 border-gray-200 bg-gray-50"
        placeholder="Sin respuesta"
      />
    );
  }

  const inputType = campo.tipo === "number" ? "number" : campo.tipo === "date" ? "date" : "text";

  return (
    <Input
      type={inputType}
      value={String(value ?? "")}
      readOnly
      className="h-11 border-gray-200 bg-gray-50"
      placeholder="Sin respuesta"
    />
  );
}

export function VerFormularioModal({ open, onOpenChange, formulario, response, patientName }: VerFormularioModalProps) {
  if (!formulario || !response) return null;

  const statusClass =
    response.estado === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-amber-50 text-amber-700 border-amber-100";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>{formulario.nombre}</DialogTitle>
              <DialogDescription>
                Información clínica registrada previamente para este paciente.
              </DialogDescription>
            </div>
            <Badge className={statusClass}>{response.estado === "completed" ? "Completado" : "Borrador"}</Badge>
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Paciente</p>
              <p className="font-medium text-slate-900">{patientName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fecha de registro</p>
              <p className="font-medium text-slate-900">{formatFecha(response.creado_en)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Doctor</p>
              <p className="font-medium text-slate-900">{response.doctorId || "-"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-2">
          {formulario.campos.sort((a, b) => a.orden - b.orden).map((campo) => {
            const value = response.respuestas?.[campo.id];
            return (
              <div key={campo.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  {campo.etiqueta}
                  {campo.requerido && <span className="text-rose-500">*</span>}
                </p>
                {renderReadOnlyField(campo, value)}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
