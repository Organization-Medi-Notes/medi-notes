"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { FormularioClinico } from "@/lib/types/formulario.types";
import { CitaFormularioCard } from "./CitaFormularioCard";
import { CitaFormSelector } from "./CitaFormSelector";

interface CitaFormulariosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any | null;
  assignedForms: any[];
  availableForms: FormularioClinico[];
  onAssignForm: (formulario: FormularioClinico) => void;
  onFillForm: (assignment: any) => void;
  onViewForm: (assignment: any) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  loading: boolean;
}

export function CitaFormulariosModal({
  open,
  onOpenChange,
  appointment,
  assignedForms,
  availableForms,
  onAssignForm,
  onFillForm,
  onViewForm,
  onRemoveAssignment,
  loading,
}: CitaFormulariosModalProps) {
  const assignedFormIds = assignedForms.map((assignment) => assignment.formularioId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle>Formularios de la cita</DialogTitle>
              <DialogDescription>
                Administre los formularios asignados a la cita y avance con las respuestas.
              </DialogDescription>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {appointment?.fecha ? new Date(appointment.fecha.seconds * 1000).toLocaleDateString("es-ES") : "Fecha no disponible"}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <CalendarIcon className="h-4 w-4" />
              <span>{appointment?.paciente_nombre || "Sin paciente asignado"}</span>
            </div>
            {appointment?.tipo_consulta && (
              <p className="mt-2 text-sm text-slate-600">Tipo de consulta: {appointment.tipo_consulta}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Formularios asignados</h3>
                  <p className="text-sm text-gray-500">Los formularios se mantienen vinculados a la cita.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {assignedForms.length} asignado(s)
                </span>
              </div>

              {assignedForms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No hay formularios asignados a esta cita.
                </div>
              ) : (
                <div className="grid gap-3">
                  {assignedForms.map((assignment) => (
                    <CitaFormularioCard
                      key={assignment.id}
                      assignment={assignment}
                      onFill={() => onFillForm(assignment)}
                      onView={() => onViewForm(assignment)}
                      onRemove={() => onRemoveAssignment(assignment.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Agregar formulario</h3>
              <p className="text-sm text-gray-500">Seleccione un formulario activo para asociarlo a la cita.</p>
              <div className="mt-4">
                <CitaFormSelector
                  forms={availableForms}
                  assignedFormIds={assignedFormIds}
                  onAssignForm={onAssignForm}
                  disabled={loading || availableForms.length === 0}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
