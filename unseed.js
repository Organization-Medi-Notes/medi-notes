/**
 * UNSEED - Limpieza de datos de prueba de Medi Notes
 *
 * Elimina únicamente los registros creados por seed.js.
 * Busca y borra todos los documentos que tengan _seed: true
 * en las colecciones que puebla seed.js (pacientes, consultas, citas,
 * formularios_clinicos, formularios_paciente, formularios_citas,
 * documentos y expedientes).
 * No toca ningún dato real que no haya sido creado por el seed.
 *
 * REQUISITOS:
 * - Haber corrido seed.js previamente
 * - Tener un archivo .env en la raíz del proyecto con las variables de Firebase
 * - Tener instalado dotenv: npm install dotenv
 *
 * CÓMO CORRER:
 * node unseed.js
 */

require("dotenv").config({ path: ".env" });

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colecciones que puebla seed.js. Si seed.js empieza a crear datos en otra
// colección, agregala aquí para que también se pueda limpiar.
const COLECCIONES = [
  { nombre: "pacientes", etiqueta: "Pacientes" },
  { nombre: "consultas", etiqueta: "Consultas" },
  { nombre: "citas", etiqueta: "Citas" },
  { nombre: "formularios_clinicos", etiqueta: "Formularios clínicos" },
  { nombre: "formularios_paciente", etiqueta: "Respuestas de formularios de pacientes" },
  { nombre: "formularios_citas", etiqueta: "Formularios asignados a citas" },
  { nombre: "documentos", etiqueta: "Documentos" },
  { nombre: "expedientes", etiqueta: "Expedientes" },
];

async function unseed() {
  console.log("Eliminando datos de seed...");

  for (const { nombre, etiqueta } of COLECCIONES) {
    const snap = await getDocs(query(collection(db, nombre), where("_seed", "==", true)));
    for (const documento of snap.docs) {
      await deleteDoc(doc(db, nombre, documento.id));
    }
    console.log(`✓ ${etiqueta} eliminados: ${snap.size}`);
  }

  console.log("\n✅ Limpieza completada");
  process.exit(0);
}

unseed().catch((err) => { console.error("Error:", err); process.exit(1); });
