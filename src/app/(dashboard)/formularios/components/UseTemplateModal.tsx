"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormularioClinico } from "@/lib/types/formulario.types";

interface UseTemplateModalProps {
  open: boolean;
  forms: FormularioClinico[];
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (formulario: FormularioClinico) => void;
}

export function UseTemplateModal({ open, forms, onOpenChange, onUseTemplate }: UseTemplateModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setSelectedTemplateId(forms[0]?.id ?? "");
  }, [open, forms]);

  const selectedTemplate = useMemo(
    () => forms.find((formulario) => formulario.id === selectedTemplateId) ?? null,
    [forms, selectedTemplateId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Usar plantilla clínica
          </DialogTitle>
          <DialogDescription>
            Seleccione una plantilla predefinida para cargar su estructura y comenzar un nuevo formulario.
          </DialogDescription>
        </DialogHeader>

        {forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No hay plantillas disponibles para cargar en este momento.
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Plantilla disponible</p>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-11 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Seleccione una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((formulario) => (
                    <SelectItem key={formulario.id} value={formulario.id ?? formulario.nombre}>
                      {formulario.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{selectedTemplate.nombre}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedTemplate.descripcion || "La plantilla no tiene descripción."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-xs">{selectedTemplate.especialidad || "General"}</Badge>
                    <Badge className="text-xs">{selectedTemplate.campos.length} campos</Badge>
                    <Badge className="text-xs bg-amber-50 text-amber-700">Plantilla</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campos que se cargarán</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.campos
                      .slice()
                      .sort((a, b) => a.orden - b.orden)
                      .map((campo) => (
                        <Badge key={campo.id} variant="outline" className="text-xs">
                          {campo.etiqueta}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-primary hover:bg-primary-dark"
            disabled={!selectedTemplate}
            onClick={() => {
              if (!selectedTemplate) return;
              onUseTemplate(selectedTemplate);
            }}
          >
            Cargar plantilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}