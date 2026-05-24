
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
  Timestamp
} from "firebase/firestore";
import { db } from "./config";
import { Paciente, Cita } from "../types";

// ID de médico para la demo (usualmente vendría del Auth)
const DEMO_MEDICO_ID = "medico_demo_1";

export const patientService = {
  async getAll() {
    const q = query(
      collection(db, "pacientes"), 
      where("medico_id", "==", DEMO_MEDICO_ID),
      orderBy("creado_en", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Formatear fechas si vienen como Timestamp de Firebase
      ultima: doc.data().actualizado_en instanceof Timestamp ? doc.data().actualizado_en.toDate().toLocaleDateString() : "Reciente"
    } as any));
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
  },

  async getToday() {
    const q = query(
      collection(db, "citas"),
      where("medico_id", "==", DEMO_MEDICO_ID),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  }
};
