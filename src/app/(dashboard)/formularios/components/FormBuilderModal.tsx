"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FormularioClinico, CampoFormulario, CampoTipo } from "@/lib/types/formulario.types";
import { useToast } from "@/hooks/use-toast";
import { formularioService } from "@/lib/firebase/formularioService";
import { ArrowUpDown, Plus, Trash2, Eye, Save, X } from "lucide-react";

interface BuilderModalProps {
  open: boolean;
  mode: "create" | "edit" | "duplicate";
  formToEdit: FormularioClinico | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const fieldLabels: Record<CampoTipo, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Lista desplegable",
  multiselect: "Selección múltiple",
  checkbox: "Checkbox",
  diagnostico: "Diagnóstico",
  medicamento: "Medicamento",
};

const getEmptyField = (tipo: CampoTipo, orden: number): CampoFormulario => ({
  id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${tipo}-${Date.now()}`,
  tipo,
  etiqueta: fieldLabels[tipo],
  placeholder: "",
  requerido: false,
  opciones: tipo === "select" || tipo === "multiselect" ? ["Opción 1"] : [],
  orden,
});

const buildInitialForm = (source?: FormularioClinico | null): FormularioClinico => {
  if (!source) {
    return {
      nombre: "",
      descripcion: "",
      especialidad: "",
      campos: [],
      version: 1,
      activo: true,
      creado_por: "",
      creado_en: {} as any,
      modificado_en: {} as any,
    };
  }

  return {
    ...source,
    campos: source.campos.map((campo) => ({ ...campo })),
  };
};

export function FormBuilderModal({ open, mode, formToEdit, onOpenChange, onSaved }: BuilderModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormularioClinico>(buildInitialForm(null));
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<string>("constructor");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (formToEdit && (mode === "edit" || mode === "duplicate")) {
      setForm(buildInitialForm(formToEdit));
      setSelectedFieldId(formToEdit.campos[0]?.id ?? null);
    } else {
      setForm(buildInitialForm(null));
      setSelectedFieldId(null);
    }
    setTabValue("constructor");
  }, [open, formToEdit, mode]);

  const selectedField = useMemo(
    () => form.campos.find((campo) => campo.id === selectedFieldId) ?? null,
    [form.campos, selectedFieldId]
  );

  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);

  const handleDragStart = (fieldId: string) => {
    setDraggedFieldId(fieldId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (targetFieldId: string) => {
    if (!draggedFieldId || draggedFieldId === targetFieldId) {
      setDraggedFieldId(null);
      return;
    }

    const sourceIndex = form.campos.findIndex((campo) => campo.id === draggedFieldId);
    const targetIndex = form.campos.findIndex((campo) => campo.id === targetFieldId);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedFieldId(null);
      return;
    }

    const reordered = Array.from(form.campos);
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    setForm((current) => ({
      ...current,
      campos: reordered.map((campo, index) => ({ ...campo, orden: index + 1 })),
    }));
    setDraggedFieldId(null);
  };

  const addField = (tipo: CampoTipo) => {
    const nextOrder = form.campos.length + 1;
    const nuevoCampo = getEmptyField(tipo, nextOrder);
    setForm((current) => ({
      ...current,
      campos: [...current.campos, nuevoCampo],
    }));
    setSelectedFieldId(nuevoCampo.id);
  };

  const updateField = (fieldId: string, changes: Partial<CampoFormulario>) => {
    setForm((current) => ({
      ...current,
      campos: current.campos.map((campo) =>
        campo.id === fieldId ? { ...campo, ...changes } : campo
      ),
    }));
  };

  const deleteField = (fieldId: string) => {
    setForm((current) => {
      const campos = current.campos.filter((campo) => campo.id !== fieldId).map((campo, index) => ({ ...campo, orden: index + 1 }));
      return {
        ...current,
        campos,
      };
    });
    setSelectedFieldId((current) => (current === fieldId ? null : current));
  };

  const validateForm = () => {
    if (!form.nombre.trim()) return "El nombre del formulario es obligatorio.";
    if (form.campos.length === 0) return "Debe agregar al menos un campo.";
    for (const campo of form.campos) {
      if (!campo.etiqueta.trim()) return "Cada campo debe tener una etiqueta.";
      if ((campo.tipo === "select" || campo.tipo === "multiselect") && campo.opciones.length === 0) {
        return "Los campos de lista deben tener al menos una opción.";
      }
    }

    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        especialidad: form.especialidad.trim(),
        campos: form.campos.map((campo) => ({ ...campo })),
      };

      if (mode === "edit" && form.id) {
        await formularioService.update(form.id, {
          ...payload,
          version: form.version + 1,
        });
        toast({ title: "Éxito", description: "Formulario actualizado correctamente." });
      } else {
        await formularioService.add(payload);
        toast({ title: "Éxito", description: "Formulario guardado correctamente." });
      }

      onSaved();
      onOpenChange(false);
    } catch (saveError) {
      console.error("Error guardando formulario:", saveError);
      toast({ title: "Error", description: "No se pudo guardar el formulario.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleOptionChange = (fieldId: string, optionIndex: number, value: string) => {
    const campo = form.campos.find((item) => item.id === fieldId);
    if (!campo) return;
    const opciones = [...campo.opciones];
    opciones[optionIndex] = value;
    updateField(fieldId, { opciones });
  };

  const addOption = (fieldId: string) => {
    const campo = form.campos.find((item) => item.id === fieldId);
    if (!campo) return;
    updateField(fieldId, { opciones: [...campo.opciones, `Opción ${campo.opciones.length + 1}`] });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const campo = form.campos.find((item) => item.id === fieldId);
    if (!campo) return;
    const opciones = campo.opciones.filter((_, index) => index !== optionIndex);
    updateField(fieldId, { opciones });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <DialogTitle>{mode === "edit" ? "Editar formulario clínico" : mode === "duplicate" ? "Duplicar formulario" : "Nuevo formulario clínico"}</DialogTitle>
              <DialogDescription>
                Use el constructor para crear un formulario estructurado y revise la vista previa antes de guardar.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11" onClick={() => setTabValue("constructor")}>Constructor</Button>
              <Button variant="outline" className="h-11" onClick={() => setTabValue("preview")}>Vista previa</Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList>
            <TabsTrigger value="constructor">Constructor</TabsTrigger>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
          </TabsList>
          <TabsContent value="constructor">
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-3">
                  <Label htmlFor="nombre">Nombre del formulario</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                    className="border-gray-200 focus:ring-primary rounded-lg h-11"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Input
                    id="especialidad"
                    value={form.especialidad}
                    onChange={(event) => setForm({ ...form, especialidad: event.target.value })}
                    className="border-gray-200 focus:ring-primary rounded-lg h-11"
                  />
                </div>

                <div className="space-y-3 sm:col-span-3">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={form.descripcion}
                    onChange={(event) => setForm({ ...form, descripcion: event.target.value })}
                    className="border-gray-200 focus:ring-primary rounded-lg resize-none min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold">Paleta de campos</h3>
                  <Badge className="text-xs">Agrega un campo por tipo al formulario</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(fieldLabels).map(([type, label]) => (
                    <Button
                      key={type}
                      variant="outline"
                      className="h-11 text-sm"
                      onClick={() => addField(type as CampoTipo)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Campos del formulario</h4>
                    <Badge className="text-xs">{form.campos.length} campos</Badge>
                  </div>

                  <div className="space-y-3">
                    {form.campos.map((campo) => (
                      <div
                        key={campo.id}
                        draggable
                        onDragStart={() => handleDragStart(campo.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(campo.id)}
                        className={`rounded-xl border p-4 ${selectedFieldId === campo.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                              <ArrowUpDown className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">{campo.etiqueta || fieldLabels[campo.tipo]}</p>
                              <p className="text-xs text-gray-500">{fieldLabels[campo.tipo]} {campo.requerido ? "• Requerido" : "• Opcional"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedFieldId(campo.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteField(campo.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Configuración del campo</h4>
                    <span className="text-xs text-gray-500">Selecciona un campo</span>
                  </div>

                  {selectedField ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="field-label">Etiqueta</Label>
                        <Input
                          id="field-label"
                          value={selectedField.etiqueta}
                          onChange={(event) => updateField(selectedField.id, { etiqueta: event.target.value })}
                          className="border-gray-200 focus:ring-primary rounded-lg h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="field-placeholder">Placeholder</Label>
                        <Input
                          id="field-placeholder"
                          value={selectedField.placeholder}
                          onChange={(event) => updateField(selectedField.id, { placeholder: event.target.value })}
                          className="border-gray-200 focus:ring-primary rounded-lg h-11"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedField.requerido}
                          onCheckedChange={(checked) => updateField(selectedField.id, { requerido: Boolean(checked) })}
                        />
                        <Label>Requerido</Label>
                      </div>

                      {(selectedField.tipo === "select" || selectedField.tipo === "multiselect") && (
                        <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">Opciones</p>
                            <Button variant="outline" size="sm" onClick={() => addOption(selectedField.id)}>
                              Agregar opción
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {selectedField.opciones.map((option, optionIndex) => (
                              <div key={`${selectedField.id}-option-${optionIndex}`} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(event) => handleOptionChange(selectedField.id, optionIndex, event.target.value)}
                                  className="border-gray-200 focus:ring-primary rounded-lg h-11"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-600"
                                  onClick={() => removeOption(selectedField.id, optionIndex)}
                                >
                                  Eliminar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                      Haz clic en un campo para editar su configuración.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="grid gap-4 py-4">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Vista previa en tiempo real</h3>
                    <p className="text-sm text-gray-500">Revisa el formulario antes de confirmar.</p>
                  </div>
                  <Badge className="text-xs">v{form.version}</Badge>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900">{form.nombre || "Formulario sin nombre"}</p>
                      {form.especialidad ? <p className="text-sm text-gray-500">{form.especialidad}</p> : null}
                    </div>
                    <p className="text-sm text-gray-500">{form.descripcion || "No hay descripción."}</p>
                  </div>

                  {form.campos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Agrega un campo para ver la vista previa.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {form.campos
                        .sort((a, b) => a.orden - b.orden)
                        .map((campo) => (
                          <div key={campo.id} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-gray-900">{campo.etiqueta}{campo.requerido ? <span className="text-rose-600">*</span> : null}</p>
                              <span className="text-xs text-gray-500">{fieldLabels[campo.tipo]}</span>
                            </div>
                            {campo.tipo === "textarea" ? (
                              <Textarea readOnly value={campo.placeholder || ""} className="border-gray-200 focus:ring-primary rounded-lg resize-none min-h-[80px]" />
                            ) : campo.tipo === "number" ? (
                              <Input readOnly type="number" placeholder={campo.placeholder} className="border-gray-200 focus:ring-primary rounded-lg h-11" />
                            ) : campo.tipo === "date" ? (
                              <Input readOnly type="date" className="border-gray-200 focus:ring-primary rounded-lg h-11" />
                            ) : campo.tipo === "select" ? (
                              <select disabled className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                {campo.opciones.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : campo.tipo === "multiselect" ? (
                              <div className="grid gap-2">
                                {campo.opciones.map((option) => (
                                  <label key={option} className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <Checkbox checked={false} readOnly />
                                    {option}
                                  </label>
                                ))}
                              </div>
                            ) : campo.tipo === "checkbox" ? (
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <Checkbox checked={false} readOnly />
                                <span>{campo.placeholder || campo.etiqueta}</span>
                              </label>
                            ) : (
                              <Input readOnly placeholder={campo.placeholder} className="border-gray-200 focus:ring-primary rounded-lg h-11" />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />Cancelar
          </Button>
          <Button className="h-11 bg-primary hover:bg-primary-dark" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" />Guardar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
