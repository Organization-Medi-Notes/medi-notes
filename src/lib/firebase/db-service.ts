
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
import { db } from "./config"; // Asegúrate de que esta importación sea correcta
import { Paciente, Cita, Expediente, Medico } from "../types";

// ID de prueba para el flujo MVP. En producción se usaría el uid del usuario autenticado.
const DEMO_MEDICO_ID = "medico_demo_1";

/**
 * Servicio optimizado para la gestión de pacientes.
 */
export const patientService = {
  // Asegúrate de que 'db' esté correctamente inicializado y accesible aquí
  db: db, // Exponer la instancia de db para ser usada externamente si es necesario, o usarla directamente aquí

  async getAll() {
    try {
      // La llamada a collection(db, "pacientes") debería funcionar si 'db' está bien importado
      const q = query(
        collection(this.db, "pacientes"), // Usar 'this.db' para asegurar que usamos la instancia correcta
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
      const docRef = doc(this.db, "pacientes", id); // Usar 'this.db'
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as any : null;
    } catch (e) {
      console.error("Error fetching patient by id:", e);
      return null;
    }
  },

  async add(data: Partial<Paciente>) {
    // Usar 'this.db' para la colección
    return await addDoc(collection(this.db, "pacientes"), {
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
  // Asegúrate de que 'db' esté correctamente inicializado y accesible aquí
  db: db,

  async getAll() {
    try {
      const q = query(
        collection(this.db, "citas"), // Usar 'this.db'
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
        collection(this.db, "citas"), // Usar 'this.db'
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
      console.error("Error fetching today's appointments:", e);
      return [];
    }
  }
};

/**
 * Servicio para expedientes clínicos.
 */
export const medicalRecordService = {
  // Asegúrate de que 'db' esté correctamente inicializado y accesible aquí
  db: db,
  async getAll() {
    try {
      const q = query(
        collection(this.db, "expedientes"), // Usar 'this.db'
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
  // Asegúrate de que 'db' esté correctamente inicializado y accesible aquí
  db: db,
  async getProfile() {
    try {
      const docRef = doc(this.db, "configuracion", DEMO_MEDICO_ID); // Usar 'this.db'
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as Medico : null;
    } catch (e) {
      console.error("Error fetching profile:", e);
      return null;
    }
  },

  async updateProfile(data: Partial<Medico>) {
    const docRef = doc(this.db, "configuracion", DEMO_MEDICO_ID); // Usar 'this.db'
    return await setDoc(docRef, { 
      ...data, 
      actualizado_en: serverTimestamp() 
    }, { merge: true });
  }
};
