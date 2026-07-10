import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./config";
import { FormularioClinico, FormularioClinicoRespuesta } from "@/lib/types/formulario.types";

type VersionSource = FormularioClinico & {
  baseFormularioId?: string;
  isCurrentVersion?: boolean;
  previousVersionId?: string;
};

function getFechaMs(fecha: any): number {
  if (!fecha) return 0;
  const maybeMillis = (fecha as any)?.toMillis?.();
  if (typeof maybeMillis === "number") return maybeMillis;
  try {
    const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return date.getTime();
  } catch {
    return 0;
  }
}

function resolveBaseId(formulario: VersionSource): string {
  return formulario.baseFormularioId ?? formulario.id ?? "";
}

function getCurrentForms(forms: VersionSource[]): VersionSource[] {
  const groups = new Map<string, VersionSource[]>();

  forms.forEach((form) => {
    const key = resolveBaseId(form);
    if (!key) return;
    const existing = groups.get(key) ?? [];
    existing.push(form);
    groups.set(key, existing);
  });

  const current: VersionSource[] = [];
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

function getFormularioEstado(formulario: FormularioClinico): "activo" | "plantilla" {
  return formulario.estadoFormulario === "plantilla" ? "plantilla" : "activo";
}

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
        .filter((formulario) => formulario.activo !== false && getFormularioEstado(formulario) === "activo")
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

  async getCurrentActive() {
    try {
      const medicoId = getMedicoId();
      const formulariosQuery = query(
        collection(this.db, "formularios_clinicos"),
        where("creado_por", "==", medicoId)
      );
      const snapshot = await getDocs(formulariosQuery);
      const allRows = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as VersionSource))
        .filter((formulario) => formulario.activo !== false && getFormularioEstado(formulario) === "activo");

      return getCurrentForms(allRows).sort((a, b) => {
        return getFechaMs(b.modificado_en ?? b.creado_en) - getFechaMs(a.modificado_en ?? a.creado_en);
      });
    } catch (error) {
      console.error("Error cargando formularios vigentes:", error);
      return [] as FormularioClinico[];
    }
  },

  async getManageable() {
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
      console.error("Error cargando formularios para gestión:", error);
      return [] as FormularioClinico[];
    }
  },

  async getTemplates() {
    try {
      const medicoId = getMedicoId();
      const formulariosQuery = query(
        collection(this.db, "formularios_clinicos"),
        where("creado_por", "==", medicoId)
      );
      const snapshot = await getDocs(formulariosQuery);
      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FormularioClinico))
        .filter((formulario) => formulario.activo !== false && getFormularioEstado(formulario) === "plantilla")
        .sort((a, b) => {
          const timeA = a.modificado_en instanceof Object && 'toMillis' in a.modificado_en ? a.modificado_en.toMillis() : 0;
          const timeB = b.modificado_en instanceof Object && 'toMillis' in b.modificado_en ? b.modificado_en.toMillis() : 0;
          return timeB - timeA;
        });
    } catch (error) {
      console.error("Error cargando plantillas clínicas:", error);
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

  async add(
    formulario: Omit<FormularioClinico, "id" | "version" | "activo" | "creado_por" | "creado_en" | "modificado_en">,
    estadoFormulario: "activo" | "plantilla" = "activo"
  ) {
    return await addDoc(collection(this.db, "formularios_clinicos"), {
      ...formulario,
      version: 1,
      activo: true,
      estadoFormulario,
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
      estadoFormulario: getFormularioEstado(formulario),
      creado_por: getMedicoId(),
      creado_en: serverTimestamp(),
      modificado_en: serverTimestamp(),
    });
  },

  async createVersionAtomic(params: {
    sourceFormId: string;
    payload: {
      nombre: string;
      descripcion: string;
      especialidad: string;
      campos: FormularioClinico["campos"];
      estadoFormulario: "activo" | "plantilla";
    };
  }) {
    const medicoId = getMedicoId();

    const sourceRef = doc(this.db, "formularios_clinicos", params.sourceFormId);
    const sourceSnapshot = await getDoc(sourceRef);
    if (!sourceSnapshot.exists()) throw new Error("El formulario origen no existe.");

    const sourceData = sourceSnapshot.data() as VersionSource;
    const baseFormularioId = sourceData.baseFormularioId ?? params.sourceFormId;
    const versionsQuery = query(
      collection(this.db, "formularios_clinicos"),
      where("creado_por", "==", medicoId),
      where("baseFormularioId", "==", baseFormularioId)
    );
    const versionsSnapshot = await getDocs(versionsQuery);
    const versionRefs = versionsSnapshot.docs.map((row) => row.ref);

    return await runTransaction(this.db, async (tx) => {
      const sourceSnap = await tx.get(sourceRef);

      if (!sourceSnap.exists()) throw new Error("El formulario origen no existe.");

      const source = sourceSnap.data() as VersionSource;
      if (source.creado_por !== medicoId) {
        throw new Error("No tiene permisos para versionar este formulario.");
      }

      let maxVersion = source.version ?? 1;

      const versionRows = await Promise.all(versionRefs.map((rowRef) => tx.get(rowRef)));

      versionRows.forEach((rowSnap) => {
        if (!rowSnap.exists()) return;
        const rowData = rowSnap.data() as VersionSource;
        maxVersion = Math.max(maxVersion, rowData.version ?? 1);
      });

      versionRows.forEach((rowSnap) => {
        if (!rowSnap.exists()) return;
        const rowData = rowSnap.data() as VersionSource;
        if (rowData.isCurrentVersion === true) {
          tx.update(rowSnap.ref, {
            isCurrentVersion: false,
            modificado_en: serverTimestamp(),
          });
        }
      });

      tx.update(sourceRef, {
        baseFormularioId,
        isCurrentVersion: false,
        modificado_en: serverTimestamp(),
      });

      const nextVersion = maxVersion + 1;
      const newVersionRef = doc(collection(this.db, "formularios_clinicos"));
      tx.set(newVersionRef, {
        ...params.payload,
        version: nextVersion,
        activo: source.activo !== false,
        baseFormularioId,
        previousVersionId: params.sourceFormId,
        isCurrentVersion: true,
        creado_por: medicoId,
        creado_en: serverTimestamp(),
        modificado_en: serverTimestamp(),
      });

      return { id: newVersionRef.id, version: nextVersion, baseFormularioId };
    });
  },

  async restoreVersionAtomic(versionId: string) {
    const medicoId = getMedicoId();

    const versionRef = doc(this.db, "formularios_clinicos", versionId);
    const versionSnapshot = await getDoc(versionRef);
    if (!versionSnapshot.exists()) throw new Error("La versión seleccionada no existe.");

    const versionData = versionSnapshot.data() as VersionSource;
    const baseFormularioId = versionData.baseFormularioId ?? versionId;
    const allVersionsQuery = query(
      collection(this.db, "formularios_clinicos"),
      where("creado_por", "==", medicoId),
      where("baseFormularioId", "==", baseFormularioId)
    );
    const allVersionsSnapshot = await getDocs(allVersionsQuery);
    const allVersionRefs = allVersionsSnapshot.docs.map((row) => row.ref);

    return await runTransaction(this.db, async (tx) => {
      const versionSnap = await tx.get(versionRef);

      if (!versionSnap.exists()) throw new Error("La versión seleccionada no existe.");

      const version = versionSnap.data() as VersionSource;
      if (version.creado_por !== medicoId) {
        throw new Error("No tiene permisos para restaurar esta versión.");
      }

      let maxVersion = version.version ?? 1;

      const versionRows = await Promise.all(allVersionRefs.map((rowRef) => tx.get(rowRef)));

      versionRows.forEach((rowSnap) => {
        if (!rowSnap.exists()) return;
        const rowData = rowSnap.data() as VersionSource;
        maxVersion = Math.max(maxVersion, rowData.version ?? 1);
      });

      versionRows.forEach((rowSnap) => {
        if (!rowSnap.exists()) return;
        const rowData = rowSnap.data() as VersionSource;
        if (rowData.isCurrentVersion === true) {
          tx.update(rowSnap.ref, {
            isCurrentVersion: false,
            modificado_en: serverTimestamp(),
          });
        }
      });

      tx.update(versionRef, {
        baseFormularioId,
        isCurrentVersion: false,
        modificado_en: serverTimestamp(),
      });

      const nextVersion = maxVersion + 1;
      const restoredRef = doc(collection(this.db, "formularios_clinicos"));
      tx.set(restoredRef, {
        nombre: version.nombre,
        descripcion: version.descripcion,
        especialidad: version.especialidad,
        campos: Array.isArray(version.campos) ? version.campos.map((campo) => ({ ...campo })) : [],
        estadoFormulario: version.estadoFormulario ?? "activo",
        version: nextVersion,
        activo: version.activo !== false,
        baseFormularioId,
        previousVersionId: versionId,
        isCurrentVersion: true,
        creado_por: medicoId,
        creado_en: serverTimestamp(),
        modificado_en: serverTimestamp(),
      });

      return { id: restoredRef.id, version: nextVersion, baseFormularioId, restoredFromVersion: version.version ?? 1 };
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
