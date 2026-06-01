import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  setDoc
} from "firebase/firestore";
import { db, auth } from "./config";
import { Paciente, Cita, Expediente, Medico } from "../types";

// Obtiene el UID del usuario autenticado en tiempo real
function getMedicoId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No hay un usuario autenticado.");
  return uid;
}

/**
 * Servicio optimizado para la gestión de pacientes.
 */
export const patientService = {
  db: db,

  async getAll() {
    try {
      const q = query(
        collection(this.db, "pacientes"),
        where("medico_id", "==", getMedicoId()),
        orderBy("creado_en", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        ultima_visita: doc.data().actualizado_en instanceof Timestamp 
          ? doc.data().actualizado_en.toDate().toLocaleDateString() 
          : "Reciente"
      } as any));
    } catch (e) {
      console.error("Error fetching patients:", e);
      return [];
    }
  },

  async getById(id: string) {
    try {
      const docRef = doc(this.db, "pacientes", id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as any : null;
    } catch (e) {
      console.error("Error fetching patient by id:", e);
      return null;
    }
  },

  async add(data: Partial<Paciente>) {
    return await addDoc(collection(this.db, "pacientes"), {
      ...data,
      medico_id: getMedicoId(),
      activo: true,
      creado_en: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });
  }
};

/**
 * Servicio optimizado para la gestión de citas y calendario.
 */
export const appointmentService = {
  db: db,

  async getAll() {
    try {
      const q = query(
        collection(this.db, "citas"),
        where("medico_id", "==", getMedicoId()),
        orderBy("fecha", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as any));
    } catch (e) {
      console.error("Error fetching appointments:", e);
      return [];
    }
  },

  async getToday() {
    try {
      const snapshot = await getDocs(query(
        collection(this.db, "citas"),
        where("medico_id", "==", getMedicoId())
      ));
      const today = new Date().toDateString();
      
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(apt => {
          const aptDate = apt.fecha instanceof Timestamp 
            ? apt.fecha.toDate().toDateString() 
            : new Date(apt.fecha).toDateString();
          return aptDate === today;
        })
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    } catch (e) {
      console.error("Error fetching today's appointments:", e);
      return [];
    }
  }
};

/**
 * Servicio para expedientes clínicos.
 */
export const medicalRecordService = {
  db: db,

  async getAll() {
    try {
      const q = query(
        collection(this.db, "expedientes"),
        where("medico_id", "==", getMedicoId()),
        orderBy("creado_en", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e) {
      console.error("Error fetching records:", e);
      return [];
    }
  }
};

/**
 * Servicio de configuración del perfil médico.
 */
export const settingsService = {
  db: db,

  async getProfile() {
    try {
      const docRef = doc(this.db, "configuracion", getMedicoId());
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as Medico : null;
    } catch (e) {
      console.error("Error fetching profile:", e);
      return null;
    }
  },

  async updateProfile(data: Partial<Medico>) {
    const docRef = doc(this.db, "configuracion", getMedicoId());
    return await setDoc(docRef, { 
      ...data, 
      actualizado_en: serverTimestamp() 
    }, { merge: true });
  }
};