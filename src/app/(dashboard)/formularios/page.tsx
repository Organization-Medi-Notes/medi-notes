"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, Loader2, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FormBuilderModal } from "./components/FormBuilderModal";
import { FormPreviewModal } from "./components/FormPreviewModal";
import { FormCard } from "./components/FormCard";
import { UseTemplateModal } from "./components/UseTemplateModal";
import { FormVersionHistoryModal } from "./components/FormVersionHistoryModal";
import { formularioService } from "@/lib/firebase/formularioService";
import { auth, db } from "@/lib/firebase/config";
import { FormularioClinico } from "@/lib/types/formulario.types";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

type VersionedForm = FormularioClinico & {
  baseFormularioId?: string;
  isCurrentVersion?: boolean;
  previousVersionId?: string;
};

function getFechaMs(fecha: any): number {
  if (!fecha) return 0;
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.getTime();
  } catch {
    return 0;
  }
}

function resolveBaseId(formulario: VersionedForm): string {
  return formulario.baseFormularioId ?? formulario.id ?? "";
}

function getCurrentForms(forms: VersionedForm[]) {
  const groups = new Map<string, VersionedForm[]>();

  forms.forEach((form) => {
    const key = resolveBaseId(form);
    if (!key) return;
    const existing = groups.get(key) ?? [];
    existing.push(form);
    groups.set(key, existing);
  });

  const current: VersionedForm[] = [];
  groups.forEach((items) => {
    const explicit = items.find((item) => item.isCurrentVersion === true);
    if (explicit) {
      current.push(explicit);
      return;
    }

    const fallback = [...items].sort((a, b) => {
      const byVersion = (b.version ?? 1) - (a.version ?? 1);
      if (byVersion !== 0) return byVersion;
      return getFechaMs(b.modificado_en ?? b.creado_en) - getFechaMs(a.modificado_en ?? a.creado_en);
    })[0];

    if (fallback) current.push(fallback);
  });

  return current;
}

export default function FormulariosPage() {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<VersionedForm[]>([]);
  const [plantillas, setPlantillas] = useState<VersionedForm[]>([]);
  const [formulariosArchivados, setFormulariosArchivados] = useState<VersionedForm[]>([]);
  const [allManageableForms, setAllManageableForms] = useState<VersionedForm[]>([]);
  const [allArchivedForms, setAllArchivedForms] = useState<VersionedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"create" | "edit" | "duplicate" | "template">("create");
  const [formToEdit, setFormToEdit] = useState<FormularioClinico | null>(null);
  const [previewForm, setPreviewForm] = useState<FormularioClinico | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUseTemplateOpen, setIsUseTemplateOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState<VersionedForm | null>(null);
  const [historyVersions, setHistoryVersions] = useState<VersionedForm[]>([]);

  const refreshHistory = useCallback((formulario: VersionedForm, manageable: VersionedForm[], archived: VersionedForm[]) => {
    const baseId = resolveBaseId(formulario);
    const pool = [...manageable, ...archived];

    const versions = pool
      .filter((item) => resolveBaseId(item) === baseId)
      .sort((a, b) => {
        const byVersion = (b.version ?? 1) - (a.version ?? 1);
        if (byVersion !== 0) return byVersion;
        return getFechaMs(b.modificado_en ?? b.creado_en) - getFechaMs(a.modificado_en ?? a.creado_en);
      });

    const currentId = getCurrentForms(versions)[0]?.id;
    const normalized = versions.map((item) => ({
      ...item,
      isCurrentVersion: item.id === currentId,
    }));

    setHistoryForm(formulario);
    setHistoryVersions(normalized);
    setIsVersionHistoryOpen(true);
  }, []);

  const loadFormularios = useCallback(async () => {
    setLoading(true);
    try {
      const [data, templates, archived] = await Promise.all([
        formularioService.getManageable(),
        formularioService.getTemplates(),
        formularioService.getArchived()
      ]);

      const manageableRows = data as VersionedForm[];
      const archivedRows = archived as VersionedForm[];
      const templateRows = templates as VersionedForm[];

      setAllManageableForms(manageableRows);
      setAllArchivedForms(archivedRows);

      const currentManageable = getCurrentForms(manageableRows);
      const currentArchived = getCurrentForms(archivedRows);

      setFormularios(currentManageable.filter((formulario) => formulario.estadoFormulario !== "plantilla"));
      setPlantillas(currentManageable.filter((formulario) => formulario.estadoFormulario === "plantilla"));
      setFormulariosArchivados(currentArchived);
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

  const handleOpenUseTemplate = useCallback(() => {
    setIsUseTemplateOpen(true);
  }, []);

  const handleOpenEdit = useCallback((formulario: FormularioClinico) => {
    setBuilderMode("edit");
    setFormToEdit(formulario);
    setIsBuilderOpen(true);
  }, []);

  const handleOpenHistory = useCallback((formulario: FormularioClinico) => {
    refreshHistory(formulario as VersionedForm, allManageableForms, allArchivedForms);
  }, [allArchivedForms, allManageableForms, refreshHistory]);

  const handleOpenDuplicate = useCallback((formulario: FormularioClinico) => {
    setBuilderMode("duplicate");
    setFormToEdit(formulario);
    setIsBuilderOpen(true);
  }, []);

  const handlePreview = useCallback((formulario: FormularioClinico) => {
    setPreviewForm(formulario);
    setIsPreviewOpen(true);
  }, []);

  const handleUseTemplate = useCallback((formulario: FormularioClinico) => {
    setBuilderMode("template");
    setFormToEdit(formulario);
    setIsUseTemplateOpen(false);
    setIsBuilderOpen(true);
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

  const handleCreateVersion = useCallback(async (params: {
    sourceForm: FormularioClinico;
    payload: {
      nombre: string;
      descripcion: string;
      especialidad: string;
      campos: any[];
      estadoFormulario: "activo" | "plantilla";
    };
  }) => {
    const { sourceForm, payload } = params;
    if (!sourceForm.id) throw new Error("El formulario no tiene identificador.");

    const medicoId = auth.currentUser?.uid;
    if (!medicoId) throw new Error("No hay un usuario autenticado.");

    const source = sourceForm as VersionedForm;
    const baseFormularioId = resolveBaseId(source);
    const nextVersion = (source.version ?? 1) + 1;

    const currentVersionsQuery = query(
      collection(db, "formularios_clinicos"),
      where("creado_por", "==", medicoId),
      where("baseFormularioId", "==", baseFormularioId),
      where("isCurrentVersion", "==", true)
    );

    const currentVersions = await getDocs(currentVersionsQuery);
    await Promise.all(currentVersions.docs.map((row) => updateDoc(row.ref, { isCurrentVersion: false })));

    await updateDoc(doc(db, "formularios_clinicos", sourceForm.id), {
      isCurrentVersion: false,
      modificado_en: serverTimestamp(),
    });

    await addDoc(collection(db, "formularios_clinicos"), {
      ...payload,
      version: nextVersion,
      activo: sourceForm.activo !== false,
      baseFormularioId,
      previousVersionId: sourceForm.id,
      isCurrentVersion: true,
      creado_por: medicoId,
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });
  }, []);

  const handleRestoreVersion = useCallback(async (version: VersionedForm) => {
    const medicoId = auth.currentUser?.uid;
    if (!medicoId) throw new Error("No hay un usuario autenticado.");
    if (!version.id) throw new Error("La versi\u00f3n no tiene identificador.");

    const baseFormularioId = resolveBaseId(version);

    const allVersionsQuery = query(
      collection(db, "formularios_clinicos"),
      where("creado_por", "==", medicoId),
      where("baseFormularioId", "==", baseFormularioId)
    );

    const allSnap = await getDocs(allVersionsQuery);
    const maxVersion = allSnap.docs.reduce((max, d) => Math.max(max, (d.data().version ?? 1)), 0);
    const nextVersion = maxVersion + 1;

    await Promise.all(
      allSnap.docs
        .filter((d) => d.data().isCurrentVersion === true)
        .map((d) => updateDoc(d.ref, { isCurrentVersion: false }))
    );

    if (!version.baseFormularioId) {
      await updateDoc(doc(db, "formularios_clinicos", version.id), {
        isCurrentVersion: false,
        modificado_en: serverTimestamp(),
      });
    }

    await addDoc(collection(db, "formularios_clinicos"), {
      nombre: version.nombre,
      descripcion: version.descripcion,
      especialidad: version.especialidad,
      campos: version.campos.map((c) => ({ ...c })),
      estadoFormulario: version.estadoFormulario ?? "activo",
      version: nextVersion,
      activo: version.activo !== false,
      baseFormularioId,
      previousVersionId: version.id,
      isCurrentVersion: true,
      creado_por: medicoId,
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });

    toast({ title: "Versi\u00f3n restaurada", description: `El formulario fue restaurado a v${version.version} como una nueva entrada (v${nextVersion}).` });
    await loadFormularios();

    const updatedManageable = allManageableForms;
    const updatedArchived = allArchivedForms;
    if (historyForm) {
      refreshHistory(historyForm, updatedManageable, updatedArchived);
    }
  }, [allArchivedForms, allManageableForms, historyForm, loadFormularios, refreshHistory, toast]);

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
          {!showArchived && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="text-xs bg-emerald-50 text-emerald-700">Activos: {formularios.filter((formulario) => formulario.estadoFormulario !== "plantilla").length}</Badge>
              <Badge className="text-xs bg-amber-50 text-amber-700">Plantillas: {plantillas.length}</Badge>
            </div>
          )}
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
            <>
              <Button variant="outline" className="h-11" onClick={handleOpenUseTemplate}>
                Usar plantilla
              </Button>
              <Button className="h-11 bg-primary hover:bg-primary-dark" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo formulario
              </Button>
            </>
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
                  onHistory={handleOpenHistory}
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
        onSaveVersion={handleCreateVersion}
      />

      <UseTemplateModal
        open={isUseTemplateOpen}
        forms={plantillas}
        onOpenChange={setIsUseTemplateOpen}
        onUseTemplate={handleUseTemplate}
      />

      <FormVersionHistoryModal
        open={isVersionHistoryOpen}
        onOpenChange={(open) => {
          setIsVersionHistoryOpen(open);
          if (!open) {
            setHistoryForm(null);
            setHistoryVersions([]);
          }
        }}
        formName={historyForm?.nombre ?? ""}
        versions={historyVersions}
        onRestore={handleRestoreVersion}
      />

      <FormPreviewModal open={isPreviewOpen} form={previewForm} onOpenChange={setIsPreviewOpen} />
    </div>
  );
}
