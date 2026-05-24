
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
import { db } from "./config";
import { Paciente, Cita, Expediente, Medico } from "../types";

// ID de prueba para el flujo MVP. En producción se usaría el uid del usuario autenticado.
const DEMO_MEDICO_ID = "medico_demo_1";

/**
 * Servicio optimizado para la gestión de pacientes.
 */
export const patientService = {
  async getAll() {
    try {
      const q = query(
        collection(db, "pacientes"), 
        where("medico_id", "==", DEMO_MEDICO_ID),
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
      const docRef = doc(db, "pacientes", id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as any : null;
    } catch (e) {
      console.error("Error fetching patient by id:", e);
      return null;
    }
  },

  async add(data: Partial<Paciente>) {
    return await addDoc(collection(db, "pacientes"), {
      ...data,
      medico_id: DEMO_MEDICO_ID,
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
  async getAll() {
    try {
      const q = query(
        collection(db, "citas"), 
        where("medico_id", "==", DEMO_MEDICO_ID),
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
        collection(db, "citas"), 
        where("medico_id", "==", DEMO_MEDICO_ID)
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
      return [];
    }
  }
};

/**
 * Servicio para expedientes clínicos.
 */
export const medicalRecordService = {
  async getAll() {
    try {
      const q = query(
        collection(db, "expedientes"),
        where("medico_id", "==", DEMO_MEDICO_ID),
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
  async getProfile() {
    try {
      const docRef = doc(db, "configuracion", DEMO_MEDICO_ID);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as Medico : null;
    } catch (e) {
      return null;
    }
  },

  async updateProfile(data: Partial<Medico>) {
    const docRef = doc(db, "configuracion", DEMO_MEDICO_ID);
    return await setDoc(docRef, { 
      ...data, 
      actualizado_en: serverTimestamp() 
    }, { merge: true });
  }
};
