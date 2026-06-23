"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { formularioService } from "@/lib/firebase/formularioService";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";
import { FormularioCompletadoCard } from "./FormularioCompletadoCard";
import { VerFormularioModal } from "./VerFormularioModal";

interface FormulariosPacienteProps {
  pacienteId: string;
  patientName: string;
  onEditDraft?: (formularioId: string) => void;
}

export function FormulariosPaciente({ pacienteId, patientName, onEditDraft }: FormulariosPacienteProps) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<FormularioClinicoRespuesta[]>([]);
  const [formsMap, setFormsMap] = useState<Record<string, FormularioClinico>>({});
  const [viewingResponse, setViewingResponse] = useState<FormularioClinicoRespuesta | null>(null);
  const [openViewModal, setOpenViewModal] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const patientResponses = await formularioService.getPatientResponses(pacienteId);

      const sorted = [...patientResponses].sort((a, b) => {
        const aMillis = (a.modificado_en as any)?.toMillis?.() ?? 0;
        const bMillis = (b.modificado_en as any)?.toMillis?.() ?? 0;
        return bMillis - aMillis;
      });

      setResponses(sorted);

      const uniqueFormIds = Array.from(new Set(sorted.map((response) => response.formularioId).filter(Boolean)));
      const forms = await Promise.all(uniqueFormIds.map((formId) => formularioService.getById(formId)));

      const nextMap: Record<string, FormularioClinico> = {};
      forms.forEach((formulario) => {
        if (formulario?.id) {
          nextMap[formulario.id] = formulario;
        }
      });

      setFormsMap(nextMap);
    } catch (error) {
      console.error("Error cargando formularios del paciente:", error);
      setResponses([]);
      setFormsMap({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pacienteId) return;
    loadData();
  }, [pacienteId]);

  const list = useMemo(() => responses, [responses]);

  async function handleCompleteDraft(response: FormularioClinicoRespuesta) {
    if (!response.id) return;
    try {
      await formularioService.updatePatientResponse(response.id, { estado: "completed" });
      await loadData();
    } catch (error) {
      console.error("Error completando borrador del formulario:", error);
    }
  }

  const selectedForm = viewingResponse?.formularioId ? formsMap[viewingResponse.formularioId] ?? null : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Formularios del paciente</p>
          <p className="text-xs text-gray-500">Historial de formularios registrados en consultas previas.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
          {list.length} registro(s)
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando formularios...
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
          No hay formularios completados.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((response) => (
            <FormularioCompletadoCard
              key={response.id}
              response={response}
              onView={() => {
                setViewingResponse(response);
                setOpenViewModal(true);
              }}
              onEditDraft={() => response.formularioId && onEditDraft?.(response.formularioId)}
              onCompleteDraft={() => handleCompleteDraft(response)}
            />
          ))}
        </div>
      )}

      <VerFormularioModal
        open={openViewModal}
        onOpenChange={(open) => {
          setOpenViewModal(open);
          if (!open) setViewingResponse(null);
        }}
        formulario={selectedForm}
        response={viewingResponse}
        patientName={patientName}
      />
    </div>
  );
}
