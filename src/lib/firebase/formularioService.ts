import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./config";
import { FormularioClinico } from "@/lib/types/formulario.types";

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
        where("creado_por", "==", medicoId),
        where("activo", "==", true),
        orderBy("modificado_en", "desc")
      );
      const snapshot = await getDocs(formulariosQuery);
      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FormularioClinico));
    } catch (error) {
      console.error("Error cargando formularios clínicos:", error);
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

  async archive(id: string) {
    const documento = doc(this.db, "formularios_clinicos", id);
    return await updateDoc(documento, {
      activo: false,
      modificado_en: serverTimestamp(),
    });
  },
};
