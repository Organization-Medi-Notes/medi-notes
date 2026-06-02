/**
 * UNSEED - Limpieza de datos de prueba de Medi Notes
 * 
 * Elimina únicamente los registros creados por seed.js.
 * Busca y borra todos los documentos que tengan _seed: true
 * en las colecciones pacientes y consultas.
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

async function unseed() {
  console.log("Eliminando datos de seed...");

  const pacientesSnap = await getDocs(query(collection(db, "pacientes"), where("_seed", "==", true)));
  for (const documento of pacientesSnap.docs) {
    await deleteDoc(doc(db, "pacientes", documento.id));
  }
  console.log(`✓ Pacientes eliminados: ${pacientesSnap.size}`);

  const consultasSnap = await getDocs(query(collection(db, "consultas"), where("_seed", "==", true)));
  for (const documento of consultasSnap.docs) {
    await deleteDoc(doc(db, "consultas", documento.id));
  }
  console.log(`✓ Consultas eliminadas: ${consultasSnap.size}`);

  console.log("\n✅ Limpieza completada");
  process.exit(0);
}

unseed().catch((err) => { console.error("Error:", err); process.exit(1); });