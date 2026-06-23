import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { auth, db } from "./config";
import { Timestamp } from "firebase/firestore";

function getMedicoId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No hay un usuario autenticado.");
  return uid;
}

export interface CitaFormularioAsignacion {
  id?: string;
  citaId: string;
  formularioId: string;
  formularioNombre: string;
  formularioEspecialidad: string;
  formularioVersion: number;
  pacienteId?: string;
  doctorId: string;
  estado: "assigned" | "draft" | "completed";
  respuestas: Record<string, string | number | boolean | string[]>;
  creado_en: Timestamp;
  modificado_en: Timestamp;
}

export const respuestaFormularioService = {
  db,

  async getAssignedForms(citaId: string) {
    try {
      const q = query(
        collection(this.db, "formularios_citas"),
        where("citaId", "==", citaId)
      );
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CitaFormularioAsignacion));

      return rows.sort((a, b) => {
        const aMillis = (a.modificado_en as any)?.toMillis?.() ?? 0;
        const bMillis = (b.modificado_en as any)?.toMillis?.() ?? 0;
        return bMillis - aMillis;
      });
    } catch (error) {
      console.error("Error cargando formularios asignados a la cita:", error);
      return [] as CitaFormularioAsignacion[];
    }
  },

  async assignFormToCita(data: {
    citaId: string;
    formularioId: string;
    formularioNombre: string;
    formularioEspecialidad: string;
    formularioVersion: number;
    pacienteId?: string;
  }) {
    try {
      const payload = {
        citaId: data.citaId,
        formularioId: data.formularioId,
        formularioNombre: data.formularioNombre,
        formularioEspecialidad: data.formularioEspecialidad,
        formularioVersion: data.formularioVersion,
        doctorId: getMedicoId(),
        estado: "assigned" as const,
        respuestas: {},
        creado_en: serverTimestamp(),
        modificado_en: serverTimestamp(),
        ...(data.pacienteId ? { pacienteId: data.pacienteId } : {}),
      };

      return await addDoc(collection(this.db, "formularios_citas"), {
        ...payload,
      });
    } catch (error) {
      console.error("Error asignando formulario a la cita:", error);
      throw error;
    }
  },

  async updateAssignedForm(
    id: string,
    data: Partial<{
      estado: "assigned" | "draft" | "completed";
      respuestas: Record<string, string | number | boolean | string[]>;
    }>
  ) {
    try {
      const docRef = doc(this.db, "formularios_citas", id);
      return await updateDoc(docRef, {
        ...data,
        modificado_en: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error actualizando formulario asignado a la cita:", error);
      throw error;
    }
  },

  async deleteAssignedForm(id: string) {
    try {
      const docRef = doc(this.db, "formularios_citas", id);
      return await deleteDoc(docRef);
    } catch (error) {
      console.error("Error eliminando formulario asignado a la cita:", error);
      throw error;
    }
  },
};
