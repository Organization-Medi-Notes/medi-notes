"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, Pencil } from "lucide-react";
import { FormularioClinicoRespuesta } from "@/lib/types/formulario.types";

interface FormularioCompletadoCardProps {
  response: FormularioClinicoRespuesta;
  onView: () => void;
  onEditDraft?: () => void;
  onCompleteDraft?: () => void;
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

export function FormularioCompletadoCard({ response, onView, onEditDraft, onCompleteDraft }: FormularioCompletadoCardProps) {
  const completed = response.estado === "completed";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">{response.formularioNombre}</p>
          <p className="text-xs text-gray-500 mt-1">Guardado: {formatFecha(response.modificado_en || response.creado_en)}</p>
        </div>
        <Badge className={completed ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}>
          {completed ? "Completado" : "Borrador"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={onView}>
          <Eye className="w-4 h-4 mr-2" />
          Ver respuestas
        </Button>

        {!completed && (
          <>
            <Button size="sm" variant="outline" onClick={onEditDraft}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-dark" onClick={onCompleteDraft}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
