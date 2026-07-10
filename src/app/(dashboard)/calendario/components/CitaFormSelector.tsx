"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormularioClinico } from "@/lib/types/formulario.types";

type CurrentForm = FormularioClinico & {
  id: string;
  activo?: boolean;
  isCurrentVersion?: boolean;
  estadoFormulario?: "activo" | "plantilla";
};

interface CitaFormSelectorProps {
  forms: FormularioClinico[];
  assignedFormIds: string[];
  onAssignForm: (formulario: FormularioClinico) => void;
  disabled?: boolean;
}

export function CitaFormSelector({ forms, assignedFormIds, onAssignForm, disabled }: CitaFormSelectorProps) {
  const availableForms = useMemo(
    () =>
      forms.filter((form): form is CurrentForm => {
        if (!form.id) return false;
        if (assignedFormIds.includes(form.id)) return false;
        if (form.activo === false) return false;
        if (form.estadoFormulario === "plantilla") return false;
        if (form.isCurrentVersion === false) return false;
        return true;
      }),
    [forms, assignedFormIds]
  );
  const [selectedFormId, setSelectedFormId] = useState<string>(availableForms[0]?.id ?? "");

  useEffect(() => {
    // Preserve user selection; only pick a default when current value is not available anymore.
    if (!availableForms.length) {
      if (selectedFormId !== "") setSelectedFormId("");
      return;
    }

    const stillExists = availableForms.some((form) => form.id === selectedFormId);
    if (!stillExists) {
      setSelectedFormId(availableForms[0].id);
    }
  }, [availableForms]);

  const selectedForm = availableForms.find((form) => form.id === selectedFormId) ?? null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Formulario disponible</label>
          <Select value={selectedFormId} onValueChange={setSelectedFormId}>
            <SelectTrigger className="w-full border-gray-200 rounded-lg h-11">
              <SelectValue placeholder="Seleccione un formulario" />
            </SelectTrigger>
            <SelectContent>
              {availableForms.map((form) => (
                <SelectItem key={form.id} value={form.id ?? ""}>
                  {form.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="h-11"
          disabled={!selectedForm || disabled}
          onClick={() => selectedForm && onAssignForm(selectedForm)}
        >
          Asignar formulario
        </Button>
      </div>

      {availableForms.length === 0 && (
        <p className="text-sm text-gray-500">No hay formularios activos y vigentes disponibles para asignar.</p>
      )}

      {selectedForm && (
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-900">{selectedForm.nombre}</p>
          <p className="text-xs text-emerald-700 mt-1">Etiquetas: Activo | Vigente</p>
          <p>{selectedForm.descripcion}</p>
        </div>
      )}
    </div>
  );
}
