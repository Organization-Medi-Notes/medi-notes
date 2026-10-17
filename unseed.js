/**
 * UNSEED - Limpieza de datos de prueba de Medi Notes
 *
 * Elimina únicamente los registros creados por seed.js (los que tienen
 * _seed: true) de la cuenta con la que se inicia sesión. No toca datos reales
 * ni datos de otras cuentas.
 *
 * Colecciones que limpia: pacientes, consultas, citas, formularios_clinicos,
 * formularios_paciente, formularios_citas, documentos y expedientes.
 *
 * Las reglas de seguridad de Firestore solo permiten leer y borrar datos
 * propios, y las reglas de consultas, documentos y formularios dependen de que
 * el paciente o la cita todavía existan. Por eso primero se borran los datos
 * que cuelgan de un paciente o de una cita y al final los pacientes y las citas.
 *
 * REQUISITOS:
 * - Haber corrido seed.js previamente
 * - Tener un archivo .env en la raíz del proyecto con las variables de Firebase
 * - Tener instalado dotenv: npm install dotenv
 *
 * CÓMO CORRER (PowerShell):
 *   $env:SEED_EMAIL="correo@ejemplo.com"; $env:SEED_PASSWORD="contraseña"; node unseed.js
 * (Git Bash / Linux / Mac):
 *   SEED_EMAIL=correo@ejemplo.com SEED_PASSWORD=contraseña node unseed.js
 */

require("dotenv").config({ path: ".env" });

const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
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

// Las reglas de seguridad verifican el dueño de cada paciente o cita del filtro "in", y Firestore
// permite como máximo 10 verificaciones de documento por consulta.
const TAMANO_LOTE = 10;

function enLotes(lista) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += TAMANO_LOTE) lotes.push(lista.slice(i, i + TAMANO_LOTE));
  return lotes;
}

async function iniciarSesion() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    throw new Error("Faltan las variables de entorno SEED_EMAIL y SEED_PASSWORD con las credenciales de la cuenta que se va a limpiar.");
  }

  const credencial = await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`Sesión iniciada como ${email}`);
  return credencial.user.uid;
}

// Borra, de las consultas que devuelve la lista de filtros, solo los documentos con _seed: true.
async function borrarSeedPorCampoEnLotes(coleccion, campo, valores) {
  let borrados = 0;

  for (const lote of enLotes(valores)) {
    const snap = await getDocs(query(collection(db, coleccion), where(campo, "in", lote)));
    for (const documento of snap.docs) {
      if (documento.data()._seed === true) {
        await deleteDoc(doc(db, coleccion, documento.id));
        borrados++;
      }
    }
  }

  return borrados;
}

async function borrarSeedPropio(coleccion, campoDueno, uid) {
  const snap = await getDocs(
    query(collection(db, coleccion), where(campoDueno, "==", uid), where("_seed", "==", true))
  );
  for (const documento of snap.docs) {
    await deleteDoc(doc(db, coleccion, documento.id));
  }
  return snap.size;
}

async function idsSeedPropios(coleccion, campoDueno, uid) {
  const snap = await getDocs(
    query(collection(db, coleccion), where(campoDueno, "==", uid), where("_seed", "==", true))
  );
  return snap.docs.map((d) => d.id);
}

async function unseed() {
  const uid = await iniciarSesion();
  console.log("Eliminando datos de seed...");

  const pacienteIds = await idsSeedPropios("pacientes", "medico_id", uid);
  const citaIds = await idsSeedPropios("citas", "medico_id", uid);

  // 1) Datos que cuelgan de una cita o de un paciente
  console.log(`✓ Formularios asignados a citas eliminados: ${await borrarSeedPorCampoEnLotes("formularios_citas", "citaId", citaIds)}`);
  console.log(`✓ Consultas eliminadas: ${await borrarSeedPorCampoEnLotes("consultas", "pacienteId", pacienteIds)}`);
  console.log(`✓ Documentos eliminados: ${await borrarSeedPorCampoEnLotes("documentos", "pacienteId", pacienteIds)}`);
  console.log(`✓ Respuestas de formularios de pacientes eliminadas: ${await borrarSeedPorCampoEnLotes("formularios_paciente", "pacienteId", pacienteIds)}`);

  // 2) Datos propios del médico
  console.log(`✓ Expedientes eliminados: ${await borrarSeedPropio("expedientes", "medico_id", uid)}`);
  console.log(`✓ Formularios clínicos eliminados: ${await borrarSeedPropio("formularios_clinicos", "creado_por", uid)}`);

  // 3) Citas y pacientes al final, porque las reglas de los datos anteriores dependen de ellos
  console.log(`✓ Citas eliminadas: ${await borrarSeedPropio("citas", "medico_id", uid)}`);
  console.log(`✓ Pacientes eliminados: ${await borrarSeedPropio("pacientes", "medico_id", uid)}`);

  console.log("\n✅ Limpieza completada");
  process.exit(0);
}

unseed().catch((err) => { console.error("Error:", err); process.exit(1); });
