import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./config";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";

function getMedicoId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No hay un usuario autenticado.");
  return uid;
}

export const formularioService = {
  db,

  async getAll() {
    try {
      const medicoId = getMedicoId();
      const formulariosQuery = query(
        collection(this.db, "formularios_clinicos"),
        where("creado_por", "==", medicoId)
      );
      const snapshot = await getDocs(formulariosQuery);
      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FormularioClinico))
        .filter((formulario) => formulario.activo !== false)
        .sort((a, b) => {
          const timeA = a.modificado_en instanceof Object && 'toMillis' in a.modificado_en ? a.modificado_en.toMillis() : 0;
          const timeB = b.modificado_en instanceof Object && 'toMillis' in b.modificado_en ? b.modificado_en.toMillis() : 0;
          return timeB - timeA;
        });
    } catch (error) {
      console.error("Error cargando formularios clínicos:", error);
      return [] as FormularioClinico[];
    }
  },

  async getArchived() {
    try {
      const medicoId = getMedicoId();
      const formulariosQuery = query(
        collection(this.db, "formularios_clinicos"),
        where("creado_por", "==", medicoId)
      );
      const snapshot = await getDocs(formulariosQuery);
      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FormularioClinico))
        .filter((formulario) => formulario.activo === false)
        .sort((a, b) => {
          const timeA = a.modificado_en instanceof Object && 'toMillis' in a.modificado_en ? a.modificado_en.toMillis() : 0;
          const timeB = b.modificado_en instanceof Object && 'toMillis' in b.modificado_en ? b.modificado_en.toMillis() : 0;
          return timeB - timeA;
        });
    } catch (error) {
      console.error("Error cargando formularios archivados:", error);
      return [] as FormularioClinico[];
    }
  },

  async getById(id: string) {
    const documento = doc(this.db, "formularios_clinicos", id);
    const snapshot = await getDoc(documento);
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as FormularioClinico) : null;
  },

  async add(formulario: Omit<FormularioClinico, "id" | "version" | "activo" | "creado_por" | "creado_en" | "modificado_en">) {
    return await addDoc(collection(this.db, "formularios_clinicos"), {
      ...formulario,
      version: 1,
      activo: true,
      creado_por: getMedicoId(),
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });
  },

  async update(id: string, formulario: Partial<FormularioClinico>) {
    const documento = doc(this.db, "formularios_clinicos", id);
    return await updateDoc(documento, {
      ...formulario,
      modificado_en: serverTimestamp(),
    });
  },

  async duplicate(formulario: FormularioClinico) {
    return await addDoc(collection(this.db, "formularios_clinicos"), {
      nombre: `${formulario.nombre} (Copia)`,
      descripcion: formulario.descripcion,
      especialidad: formulario.especialidad,
      campos: formulario.campos,
      version: 1,
      activo: true,
      creado_por: getMedicoId(),
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });
  },

  async getPatientResponses(pacienteId: string) {
    try {
      const respuestasQuery = query(
        collection(this.db, "formularios_paciente"),
        where("pacienteId", "==", pacienteId)
      );
      const snapshot = await getDocs(respuestasQuery);
      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FormularioClinicoRespuesta));
    } catch (error) {
      console.error("Error cargando respuestas de formularios del paciente:", error);
      return [] as FormularioClinicoRespuesta[];
    }
  },

  async getPatientResponse(pacienteId: string, formularioId: string) {
    try {
      const respuestasQuery = query(
        collection(this.db, "formularios_paciente"),
        where("pacienteId", "==", pacienteId),
        where("formularioId", "==", formularioId)
      );
      const snapshot = await getDocs(respuestasQuery);
      const docSnap = snapshot.docs[0];
      return docSnap ? ({ id: docSnap.id, ...docSnap.data() } as FormularioClinicoRespuesta) : null;
    } catch (error) {
      console.error("Error cargando respuesta clínica del paciente:", error);
      return null;
    }
  },

  async savePatientResponse(response: Omit<FormularioClinicoRespuesta, "id" | "creado_en" | "modificado_en">) {
    return await addDoc(collection(this.db, "formularios_paciente"), {
      ...response,
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });
  },

  async updatePatientResponse(
    id: string,
    response: Partial<Omit<FormularioClinicoRespuesta, "id" | "pacienteId" | "formularioId" | "creado_en" | "doctorId">>
  ) {
    const documento = doc(this.db, "formularios_paciente", id);
    return await updateDoc(documento, {
      ...response,
      modificado_en: serverTimestamp(),
    });
  },

  async archive(id: string) {
    const documento = doc(this.db, "formularios_clinicos", id);
    return await updateDoc(documento, {
      activo: false,
      modificado_en: serverTimestamp(),
    });
  },

  async unarchive(id: string) {
    const documento = doc(this.db, "formularios_clinicos", id);
    return await updateDoc(documento, {
      activo: true,
      modificado_en: serverTimestamp(),
    });
  },

  async delete(id: string) {
    const documento = doc(this.db, "formularios_clinicos", id);
    return await deleteDoc(documento);
  },
};
