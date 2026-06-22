"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { FormularioClinico } from "@/lib/types/formulario.types";

type VersionedForm = FormularioClinico & {
  baseFormularioId?: string;
  isCurrentVersion?: boolean;
  previousVersionId?: string;
};

interface FormVersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  versions: VersionedForm[];
  onRestore?: (version: VersionedForm) => Promise<void>;
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

export function FormVersionHistoryModal({ open, onOpenChange, formName, versions, onRestore }: FormVersionHistoryModalProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function handleRestore(version: VersionedForm) {
    if (!onRestore || !version.id) return;
    setRestoringId(version.id);
    try {
      await onRestore(version);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
          <DialogDescription>
            Evolucion del formulario {formName ? `"${formName}"` : "seleccionado"} con trazabilidad clinica.
          </DialogDescription>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            No hay versiones historicas para este formulario.
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {versions.map((version) => {
              const isCurrent = version.isCurrentVersion === true || (version.isCurrentVersion === undefined && version.version === Math.max(...versions.map((v) => v.version ?? 1)));

              return (
                <div key={version.id ?? `${version.baseFormularioId}-${version.version}`} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Version {version.version ?? "-"}</p>
                      <p className="text-xs text-gray-500 mt-1">Creada: {formatFecha(version.creado_en)}</p>
                      <p className="text-xs text-gray-500 mt-1">Ultima actualizacion: {formatFecha(version.modificado_en)}</p>
                      <p className="text-xs text-gray-500 mt-1">Autor: {version.creado_por || "-"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={isCurrent ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                        {isCurrent ? "Vigente" : "Histórica"}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-700">{version.campos?.length ?? 0} campos</Badge>
                      {!isCurrent && onRestore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={restoringId === version.id}
                          onClick={() => handleRestore(version)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          {restoringId === version.id ? "Restaurando..." : "Restaurar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
