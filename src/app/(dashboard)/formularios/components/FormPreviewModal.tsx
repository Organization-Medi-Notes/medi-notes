"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormularioClinico } from "@/lib/types/formulario.types";
import { Printer } from "lucide-react";

interface FormPreviewModalProps {
  open: boolean;
  form: FormularioClinico | null;
  onOpenChange: (open: boolean) => void;
  onPrint?: (form: FormularioClinico) => void;
}

const renderFieldPreview = (field: FormularioClinico["campos"][number]) => {
  switch (field.tipo) {
    case "textarea":
      return (
        <Textarea value={field.placeholder || ""} readOnly className="border-gray-200 focus:ring-primary rounded-lg resize-none min-h-[80px]" />
      );

    case "number":
      return <Input type="number" placeholder={field.placeholder} readOnly className="border-gray-200 focus:ring-primary rounded-lg h-11" />;

    case "date":
      return <Input type="date" placeholder={field.placeholder} readOnly className="border-gray-200 focus:ring-primary rounded-lg h-11" />;

    case "select":
      return (
        <Select value={field.opciones[0] ?? ""} onValueChange={() => {}}>
          <SelectTrigger disabled className="border-gray-200 rounded-lg h-11">
            <SelectValue placeholder="Sin opciones" />
          </SelectTrigger>
          <SelectContent>
            {field.opciones.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect":
      return (
        <div className="grid gap-2">
          {field.opciones.map((option) => (
            <label key={option} className="inline-flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={false} readOnly />
              {option}
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <Checkbox checked={false} readOnly />
          <span>{field.placeholder || ""}</span>
        </label>
      );

    default:
      return <Input placeholder={field.placeholder} readOnly className="border-gray-200 focus:ring-primary rounded-lg h-11" />;
  }
};

export function FormPreviewModal({ open, form, onOpenChange, onPrint }: FormPreviewModalProps) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle>{form.nombre}</DialogTitle>
              <DialogDescription>{form.descripcion || "Vista previa del formulario clínico."}</DialogDescription>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">v{form.version}</span>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {form.campos
            .sort((a, b) => a.orden - b.orden)
            .map((field) => (
              <div key={field.id} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{field.etiqueta} {field.requerido && <span className="text-rose-600">*</span>}</p>
                    <p className="text-xs text-gray-500 uppercase">{field.tipo}</p>
                  </div>
                  {field.tipo === "select" && <span className="text-xs text-gray-500">Opciones: {field.opciones.length}</span>}
                </div>
                {renderFieldPreview(field)}
              </div>
            ))}
        </div>

        <DialogFooter className="mt-6">
          {onPrint && (
            <Button variant="outline" className="h-11" onClick={() => onPrint(form)}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          )}
          <Button className="h-11 bg-primary hover:bg-primary-dark" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
