"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FormularioClinico } from "@/lib/types/formulario.types";

export type FormResponseValue = string | number | boolean | string[];

interface CitaFormFillerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulario: FormularioClinico | null;
  assignment: any | null;
  onSave: (values: Record<string, FormResponseValue>, status: "draft" | "completed") => Promise<void>;
  saving: boolean;
}

function buildResponseValues(
  formulario: FormularioClinico,
  assignment: any | null
): Record<string, FormResponseValue> {
  const values: Record<string, FormResponseValue> = {};
  formulario.campos.forEach((campo) => {
    const existing = assignment?.respuestas?.[campo.id];
    if (existing !== undefined) {
      values[campo.id] = existing as FormResponseValue;
      return;
    }

    if (campo.tipo === "checkbox") {
      values[campo.id] = false;
    } else if (campo.tipo === "multiselect") {
      values[campo.id] = [];
    } else {
      values[campo.id] = "";
    }
  });
  return values;
}

export function CitaFormFiller({ open, onOpenChange, formulario, assignment, onSave, saving }: CitaFormFillerProps) {
  const [responseValues, setResponseValues] = useState<Record<string, FormResponseValue>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const title = formulario ? `Formulario: ${formulario.nombre}` : "Formulario";

  useEffect(() => {
    if (!formulario) return;
    setResponseValues(buildResponseValues(formulario, assignment));
    setValidationMessage(null);
  }, [formulario, assignment]);

  const handleChange = (campoId: string, value: FormResponseValue) => {
    setResponseValues((prev) => ({ ...prev, [campoId]: value }));
  };

  const validate = () => {
    if (!formulario) return false;
    const missing = formulario.campos.some((campo) => {
      if (!campo.requerido) return false;
      const value = responseValues[campo.id];
      if (campo.tipo === "checkbox") return value !== true;
      if (campo.tipo === "multiselect") return Array.isArray(value) && value.length === 0;
      return value === "" || value === undefined || value === null;
    });

    if (missing) {
      setValidationMessage("Por favor complete todos los campos obligatorios antes de continuar.");
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const handleSave = async (status: "draft" | "completed") => {
    if (!formulario) return;
    if (!validate()) return;
    await onSave(responseValues, status);
  };

  if (!formulario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Complete el formulario asignado a la cita. Puede guardar como borrador o completar la respuesta.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {validationMessage && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {validationMessage}
            </div>
          )}

          {formulario.campos
            .sort((a, b) => a.orden - b.orden)
            .map((campo) => {
              const value = responseValues[campo.id];
              return (
                <div key={campo.id} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {campo.etiqueta} {campo.requerido && <span className="text-rose-600">*</span>}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">{campo.tipo}</p>
                    </div>
                  </div>

                  {campo.tipo === "textarea" ? (
                    <Textarea
                      value={String(value || "")}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder}
                      className="border-gray-200"
                    />
                  ) : campo.tipo === "number" ? (
                    <Input
                      type="number"
                      value={value as number | string}
                      onChange={(e) => handleChange(campo.id, Number(e.target.value))}
                      placeholder={campo.placeholder}
                      className="border-gray-200"
                    />
                  ) : campo.tipo === "date" ? (
                    <Input
                      type="date"
                      value={value as string}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                      className="border-gray-200"
                    />
                  ) : campo.tipo === "select" ? (
                    <select
                      className="w-full rounded-lg border border-gray-200 p-3"
                      value={String(value || "")}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                    >
                      <option value="">Seleccione una opción</option>
                      {campo.opciones.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : campo.tipo === "multiselect" ? (
                    <div className="grid gap-2">
                      {campo.opciones.map((option) => {
                        const checked = Array.isArray(value) && (value as string[]).includes(option);
                        return (
                          <label key={option} className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(checked) => {
                                const next = Array.isArray(value) ? [...value] : [];
                                if (checked) {
                                  if (!next.includes(option)) next.push(option);
                                } else {
                                  const index = next.indexOf(option);
                                  if (index >= 0) next.splice(index, 1);
                                }
                                handleChange(campo.id, next);
                              }}
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  ) : campo.tipo === "checkbox" ? (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => handleChange(campo.id, Boolean(checked))}
                      />
                      <span>{campo.placeholder || "Marcar"}</span>
                    </label>
                  ) : (
                    <Input
                      value={String(value || "")}
                      onChange={(e) => handleChange(campo.id, e.target.value)}
                      placeholder={campo.placeholder}
                      className="border-gray-200"
                    />
                  )}
                </div>
              );
            })}
        </div>

        <DialogFooter className="mt-6 gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={() => handleSave("draft")}>Guardar borrador</Button>
          <Button disabled={saving} onClick={() => handleSave("completed")}>Marcar como completado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
