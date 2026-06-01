/**
 * SEED - Datos de prueba para Medi Notes
 *
 * Crea N pacientes con M consultas cada uno de forma aleatoria en Firestore.
 * Todos los registros se marcan con _seed: true para poder eliminarlos fácilmente.
 *
 * CONFIGURACIÓN:
 * - Cambiá CANTIDAD_PACIENTES para controlar cuántos pacientes se crean
 * - Cambiá CONSULTAS_POR_PACIENTE para controlar cuántas consultas tiene cada uno
 *
 * REQUISITOS:
 * - Tener un archivo .env en la raíz del proyecto con las variables de Firebase
 * - Tener instalado dotenv: npm install dotenv
 *
 * CÓMO CORRER:
 * node seed.js
 */

require("dotenv").config({ path: ".env" });

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, Timestamp } = require("firebase/firestore");

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

const DOCTOR_ID = "medico_demo_1";

// ── Cambiá estos números según lo que necesitás ──
const CANTIDAD_PACIENTES = 1;  // cuántos pacientes querés
const CONSULTAS_POR_PACIENTE = 10;  // cuántas consultas por paciente

// ── Datos aleatorios ──
const NOMBRES = ["Carlos", "María", "Luis", "Ana", "Jorge", "Sofía", "Diego", "Valentina", "Andrés", "Natalia", "Roberto", "Paola", "Miguel", "Laura", "Esteban"];
const APELLIDOS = ["González", "Mora", "Jiménez", "Rodríguez", "Castro", "Vargas", "Solano", "Pérez", "Méndez", "Araya", "Quesada", "Herrera", "Blanco", "Campos", "Núñez"];
const SEXOS = ["masculino", "femenino"];
const GRUPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const ASEGURADORAS = ["INS", "Caja Costarricense", "Mapfre", "Allianz"];
const PROVINCIAS = ["San José", "Heredia", "Alajuela", "Cartago", "Guanacaste", "Puntarenas", "Limón"];
const ALERGIAS_OPCIONES = ["Penicilina", "Ibuprofeno", "Aspirina", "Látex", "Polen", "Ácaros", "Mariscos", "Sulfas", "AINEs", "Ninguna conocida"];
const MEDICAMENTOS_OPCIONES = ["Enalapril 10mg", "Metformina 500mg", "Atorvastatina 20mg", "Losartán 50mg", "Omeprazol 20mg", "Loratadina 10mg", "Fluoxetina 20mg", "Amlodipino 5mg"];
const TAGS_OPCIONES = ["Hipertensión", "Diabetes", "Asma", "Migraña", "Colesterol", "Gastritis", "Alergia", "Control mensual", "Alto riesgo", "Salud mental", "Primera vez"];
const MOTIVOS_CONSULTA = ["Control mensual de rutina", "Dolor de cabeza persistente", "Fiebre y malestar general", "Control de presión arterial", "Revisión de exámenes", "Dolor abdominal", "Tos y congestión nasal", "Control de diabetes", "Mareos y náuseas", "Revisión postoperatoria"];
const EXAMENES_FISICOS = [
  "PA: 120/80 mmHg, FC: 72 lpm, peso 70kg. Paciente en buen estado general.",
  "PA: 145/90 mmHg, FC: 85 lpm. Paciente refiere cefalea ocasional.",
  "Temperatura 38.2°C, FR: 18 rpm. Faringe levemente eritematosa.",
  "Glucemia: 145 mg/dL, peso 88kg. Abdomen sin hallazgos.",
  "SatO2: 97%, auscultación pulmonar normal. Sin signos de alarma.",
];
const DIAGNOSTICOS_OPCIONES = ["Hipertensión arterial esencial", "Diabetes mellitus tipo 2", "Infección respiratoria alta", "Gastritis crónica", "Cefalea tensional", "Rinitis alérgica", "Ansiedad generalizada", "Hipotiroidismo", "Asma bronquial leve"];
const TRATAMIENTOS = ["Continuar tratamiento actual", "Ajuste de dosis según respuesta", "Reposo relativo por 3 días", "Antibiótico por 7 días", "Antiinflamatorio por 5 días", "Control en 15 días con exámenes"];
const INDICACIONES = ["Dieta baja en sodio y grasas", "Hidratación abundante", "Evitar estrés y actividad intensa", "Tomar medicamento con el desayuno", "Control en casa dos veces al día", "Consultar si los síntomas empeoran"];
const NOTAS_CLINICAS = ["Paciente colaborador, entiende indicaciones.", "Se refiere a especialista para seguimiento.", "Buen control desde última visita.", "Paciente refiere estrés laboral elevado.", "Sin cambios significativos respecto a consulta anterior."];

function aleatorio(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function aleatorioN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fechaAleatoria(añoMin, añoMax) {
  const año = numeroAleatorio(añoMin, añoMax);
  const mes = numeroAleatorio(1, 12);
  const dia = numeroAleatorio(1, 28);
  return Timestamp.fromDate(new Date(`${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`));
}

function generarCedula() {
  return String(numeroAleatorio(100000000, 999999999));
}

function generarTelefono() {
  return String(numeroAleatorio(60000000, 89999999));
}

function generarPaciente(i) {
  const nombre = aleatorio(NOMBRES);
  const apellido1 = aleatorio(APELLIDOS);
  const apellido2 = aleatorio(APELLIDOS);
  const sexo = aleatorio(SEXOS);
  const provincia = aleatorio(PROVINCIAS);

  return {
    nombre,
    apellidos: `${apellido1} ${apellido2}`,
    cedula: generarCedula(),
    fechaNacimiento: fechaAleatoria(1955, 2005),
    sexo,
    telefono: generarTelefono(),
    email: `paciente${i + 1}@ejemplo.com`,
    direccion: `${provincia}, Costa Rica`,
    contactoEmergenciaNombre: `${aleatorio(NOMBRES)} ${aleatorio(APELLIDOS)}`,
    contactoEmergenciaTelefono: generarTelefono(),
    grupoSanguineo: aleatorio(GRUPOS_SANGUINEOS),
    aseguradora: aleatorio(ASEGURADORAS),
    numeroPoliza: `POL-${String(i + 1).padStart(3, "0")}`,
    alergias: aleatorioN(ALERGIAS_OPCIONES, numeroAleatorio(0, 2)),
    medicamentosActuales: aleatorioN(MEDICAMENTOS_OPCIONES, numeroAleatorio(0, 3)),
    antecedentesFamiliares: `${aleatorio(["Padre", "Madre", "Abuelo", "Abuela"])} con ${aleatorio(["hipertensión", "diabetes", "cardiopatía", "cáncer"])}`,
    antecedentesPersonales: `${aleatorio(["Sin antecedentes relevantes", "Hipertensión desde 2018", "Diabetes tipo 2", "Asma desde la infancia", "Gastritis crónica"])}`,
    activo: Math.random() > 0.1,
    creado_en: Timestamp.now(),
    actualizado_en: Timestamp.now(),
    fechaRegistro: Timestamp.now(),
    creadoPor: DOCTOR_ID,
    medico_id: DOCTOR_ID,
    tags: aleatorioN(TAGS_OPCIONES, numeroAleatorio(1, 3)),
    _seed: true,
  };
}

function generarConsulta(pacienteId) {
  return {
    pacienteId,
    doctorId: DOCTOR_ID,
    citaId: "",
    fecha: fechaAleatoria(2024, 2026),
    fechaCreacion: Timestamp.now(),
    motivoConsulta: aleatorio(MOTIVOS_CONSULTA),
    examenFisico: aleatorio(EXAMENES_FISICOS),
    diagnostico: aleatorioN(DIAGNOSTICOS_OPCIONES, numeroAleatorio(1, 2)),
    tratamiento: aleatorio(TRATAMIENTOS),
    indicaciones: aleatorio(INDICACIONES),
    notasClinicas: aleatorio(NOTAS_CLINICAS),
    resumenIA: "",
    _seed: true,
  };
}

async function seed() {
  console.log(`Creando ${CANTIDAD_PACIENTES} pacientes con ${CONSULTAS_POR_PACIENTE} consultas cada uno...\n`);

  for (let i = 0; i < CANTIDAD_PACIENTES; i++) {
    const pacienteData = generarPaciente(i);
    const pacienteRef = await addDoc(collection(db, "pacientes"), pacienteData);
    console.log(`✓ Paciente ${i + 1}/${CANTIDAD_PACIENTES}: ${pacienteData.nombre} ${pacienteData.apellidos}`);

    for (let j = 0; j < CONSULTAS_POR_PACIENTE; j++) {
      await addDoc(collection(db, "consultas"), generarConsulta(pacienteRef.id));
    }
    console.log(`  ✓ ${CONSULTAS_POR_PACIENTE} consultas creadas`);
  }

  console.log(`\n✅ Seed completado: ${CANTIDAD_PACIENTES} pacientes, ${CANTIDAD_PACIENTES * CONSULTAS_POR_PACIENTE} consultas`);
  process.exit(0);
}

seed().catch((err) => { console.error("Error en seed:", err); process.exit(1); });