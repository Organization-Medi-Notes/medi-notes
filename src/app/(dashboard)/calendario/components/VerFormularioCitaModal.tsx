"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormularioClinico } from "@/lib/types/formulario.types";

interface VerFormularioCitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulario: FormularioClinico | null;
  assignment: any | null;
}

function formatValue(value: any) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value ?? "-");
}

export function VerFormularioCitaModal({ open, onOpenChange, formulario, assignment }: VerFormularioCitaModalProps) {
  if (!formulario || !assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formulario.nombre}</DialogTitle>
          <DialogDescription>
            Resumen de respuestas guardadas para este formulario asociado a la cita.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {formulario.campos
            .sort((a, b) => a.orden - b.orden)
            .map((campo) => (
              <div key={campo.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">{campo.etiqueta}</p>
                <p className="mt-2 text-sm text-gray-700">{formatValue(assignment.respuestas?.[campo.id])}</p>
              </div>
            ))}
        </div>

        <DialogFooter className="mt-6">
          <Button className="h-11 bg-primary hover:bg-primary/90" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
