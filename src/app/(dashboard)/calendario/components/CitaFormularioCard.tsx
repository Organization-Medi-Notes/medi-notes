"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Trash2 } from "lucide-react";

interface CitaFormularioCardProps {
  assignment: any;
  onFill: () => void;
  onView: () => void;
  onRemove: () => void;
}

export function CitaFormularioCard({ assignment, onFill, onView, onRemove }: CitaFormularioCardProps) {
  const statusLabel =
    assignment.estado === "completed"
      ? "Completado"
      : assignment.estado === "draft"
      ? "Borrador"
      : "Asignado";

  const badgeColor =
    assignment.estado === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : assignment.estado === "draft"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-800";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{assignment.formularioNombre}</p>
          <p className="text-xs text-gray-500">{assignment.formularioEspecialidad}</p>
        </div>

        <Badge className={badgeColor}>{statusLabel}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {assignment.estado !== "completed" ? (
          <Button size="sm" onClick={onFill} className="bg-primary text-white hover:bg-primary/90">
            <FileText className="w-4 h-4 mr-2" />
            Llenar
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="w-4 h-4 mr-2" />
            Ver
          </Button>
        )}

        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onRemove}>
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
