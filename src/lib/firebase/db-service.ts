
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

// ID de médico para la demo (usualmente vendría del Auth)
const DEMO_MEDICO_ID = "medico_demo_1";

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
        ultima: doc.data().actualizado_en instanceof Timestamp ? doc.data().actualizado_en.toDate().toLocaleDateString() : "Reciente"
      } as any));
    } catch (e) {
      console.error("Error fetching patients:", e);
      return [];
    }
  },

  async getById(id: string) {
    const docRef = doc(db, "pacientes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as any;
    }
    return null;
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
      const q = query(
        collection(db, "citas"),
        where("medico_id", "==", DEMO_MEDICO_ID),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e) {
      return [];
    }
  }
};

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
  },

  async add(data: Partial<Expediente>) {
    return await addDoc(collection(db, "expedientes"), {
      ...data,
      medico_id: DEMO_MEDICO_ID,
      creado_en: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });
  }
};

export const settingsService = {
  async getProfile() {
    const docRef = doc(db, "configuracion", DEMO_MEDICO_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Medico;
    }
    return null;
  },

  async updateProfile(data: Partial<Medico>) {
    const docRef = doc(db, "configuracion", DEMO_MEDICO_ID);
    return await setDoc(docRef, { ...data, actualizado_en: serverTimestamp() }, { merge: true });
  }
};
