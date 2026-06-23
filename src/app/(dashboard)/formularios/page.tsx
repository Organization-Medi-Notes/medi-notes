"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, Loader2, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FormBuilderModal } from "./components/FormBuilderModal";
import { FormPreviewModal } from "./components/FormPreviewModal";
import { FormCard } from "./components/FormCard";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico } from "@/lib/types/formulario.types";

export default function FormulariosPage() {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioClinico[]>([]);
  const [formulariosArchivados, setFormulariosArchivados] = useState<FormularioClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"create" | "edit" | "duplicate">("create");
  const [formToEdit, setFormToEdit] = useState<FormularioClinico | null>(null);
  const [previewForm, setPreviewForm] = useState<FormularioClinico | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadFormularios = useCallback(async () => {
    setLoading(true);
    try {
      const [data, archived] = await Promise.all([
        formularioService.getAll(),
        formularioService.getArchived()
      ]);
      setFormularios(data);
      setFormulariosArchivados(archived);
    } catch (error) {
      console.error("Error cargando formularios:", error);
      toast({ title: "Error", description: "No se pudieron cargar los formularios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFormularios();
  }, [loadFormularios]);

  const handleOpenCreate = useCallback(() => {
    setBuilderMode("create");
    setFormToEdit(null);
    setIsBuilderOpen(true);
  }, []);

  const handleOpenEdit = useCallback((formulario: FormularioClinico) => {
    setBuilderMode("edit");
    setFormToEdit(formulario);
    setIsBuilderOpen(true);
  }, []);

  const handleOpenDuplicate = useCallback((formulario: FormularioClinico) => {
    setBuilderMode("duplicate");
    setFormToEdit(formulario);
    setIsBuilderOpen(true);
  }, []);

  const handlePreview = useCallback((formulario: FormularioClinico) => {
    setPreviewForm(formulario);
    setIsPreviewOpen(true);
  }, []);

  const handleArchive = useCallback(async (formulario: FormularioClinico) => {
    if (!formulario.id) return;
    try {
      await formularioService.archive(formulario.id);
      toast({ title: "Formulario archivado", description: "El formulario se archivó correctamente." });
      await loadFormularios();
    } catch (error) {
      console.error("Error archivando formulario:", error);
      toast({ title: "Error", description: "No se pudo archivar el formulario.", variant: "destructive" });
    }
  }, [loadFormularios, toast]);

  const handleUnarchive = useCallback(async (formulario: FormularioClinico) => {
    if (!formulario.id) return;
    try {
      await formularioService.unarchive(formulario.id);
      toast({ title: "Formulario desarchivado", description: "El formulario se desarchivó correctamente." });
      await loadFormularios();
      setShowArchived(false);
    } catch (error) {
      console.error("Error desarchivando formulario:", error);
      toast({ title: "Error", description: "No se pudo desarchivar el formulario.", variant: "destructive" });
    }
  }, [loadFormularios, toast]);

  const handleDelete = useCallback(async (formulario: FormularioClinico) => {
    if (!formulario.id) return;
    
    const confirmed = window.confirm(
      `¿Está seguro de que desea eliminar el formulario "${formulario.nombre}"? Esta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    try {
      await formularioService.delete(formulario.id);
      toast({ title: "Formulario eliminado", description: "El formulario se eliminó correctamente." });
      await loadFormularios();
    } catch (error) {
      console.error("Error eliminando formulario:", error);
      toast({ title: "Error", description: "No se pudo eliminar el formulario.", variant: "destructive" });
    }
  }, [loadFormularios, toast]);

  const handleSaved = useCallback(async () => {
    await loadFormularios();
  }, [loadFormularios]);

  const displayFormularios = showArchived ? formulariosArchivados : formularios;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-primary" />
            Formularios Clínicos
          </h1>
          <p className="text-gray-500 mt-1">Cree y gestione formularios clínicos estructurados para sus consultas.</p>
        </div>
        <div className="flex gap-3">
          {formulariosArchivados.length > 0 && (
            <Button 
              variant={showArchived ? "default" : "outline"} 
              className={`h-11 ${showArchived ? "bg-primary hover:bg-primary-dark" : ""}`}
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archivados ({formulariosArchivados.length})
            </Button>
          )}
          {!showArchived && (
            <Button className="h-11 bg-primary hover:bg-primary-dark" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo formulario
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-10 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p>Cargando formularios clínicos...</p>
          </div>
        ) : displayFormularios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
            <p className="text-lg font-semibold">
              {showArchived ? "No hay formularios archivados." : "Aún no tiene formularios clínicos."}
            </p>
            <p className="mt-2">
              {showArchived 
                ? "Los formularios archivados aparecerán aquí." 
                : "Cree uno nuevo para comenzar a capturar información estandarizada."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayFormularios.map((formulario, index) => (
              <div key={formulario.id ?? `form-${index}`} className="relative">
                <FormCard
                  form={formulario}
                  onEdit={!showArchived ? handleOpenEdit : undefined}
                  onDuplicate={!showArchived ? handleOpenDuplicate : undefined}
                  onArchive={!showArchived ? handleArchive : undefined}
                  onDelete={showArchived ? handleDelete : undefined}
                  onPreview={handlePreview}
                />
                {showArchived && (
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleUnarchive(formulario)}
                      title="Desarchivar formulario"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FormBuilderModal
        open={isBuilderOpen}
        mode={builderMode}
        formToEdit={formToEdit}
        onOpenChange={setIsBuilderOpen}
        onSaved={handleSaved}
      />

      <FormPreviewModal open={isPreviewOpen} form={previewForm} onOpenChange={setIsPreviewOpen} />
    </div>
  );
}
