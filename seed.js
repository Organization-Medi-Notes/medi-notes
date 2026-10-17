/**
 * SEED - Datos de prueba para Medi Notes
 *
 * Crea datos aleatorios en TODOS los módulos de la aplicación para poder
 * probarla o demostrarla con información realista:
 *
 *   Colección Firestore         Módulo donde se ve
 *   ─────────────────────────   ────────────────────────────────────────────
 *   pacientes                   Pacientes, Expedientes, Dashboard
 *   consultas                   Perfil del paciente, Expedientes, Reportes
 *   citas                       Citas, Calendario, Dashboard, Reportes
 *   formularios_clinicos        Formularios (activos, plantillas, archivados)
 *   formularios_paciente        Perfil del paciente, Expedientes
 *   formularios_citas           Formularios asignados a una cita
 *   documentos                  Perfil del paciente, Expedientes
 *   expedientes                 Dashboard (ver nota más abajo)
 *
 * Todos los registros se marcan con _seed: true para poder eliminarlos
 * fácilmente con unseed.js sin tocar datos reales.
 *
 * NO se crean: usuarios (dependen de Firebase Authentication), configuracion
 * (es el perfil real del médico y se sobrescribiría) ni auditorias (ninguna
 * pantalla las lee).
 *
 * CONFIGURACIÓN:
 * - Cambiá las constantes de la sección "CONFIGURACIÓN" para controlar cuántos
 *   datos de cada tipo se crean. Poné 0 para omitir ese tipo de dato.
 * - Los datos se crean para la cuenta con la que se inicia sesión: indicala con
 *   las variables de entorno SEED_EMAIL y SEED_PASSWORD. Las reglas de seguridad
 *   de Firestore solo dejan escribir datos propios, así que el script inicia
 *   sesión como esa cuenta y usa su UID.
 *
 * NOTAS:
 * - Si corrés el seed varias veces seguidas se acumulan datos (por ejemplo,
 *   formularios con el mismo nombre). Corré unseed.js antes para empezar limpio.
 * - La colección "expedientes" hoy no la escribe ninguna pantalla de la
 *   aplicación; solo la lee el Dashboard (resumen documental y documento de
 *   apoyo clínico). Sembrarla permite probar esas secciones, pero no
 *   reemplaza corregir ese origen de datos. Poné EXPEDIENTES_POR_PACIENTE = 0
 *   si no la querés.
 * - Los documentos adjuntos apuntan a un PDF público de ejemplo (W3C), no a
 *   archivos reales del paciente.
 *
 * REQUISITOS:
 * - Tener un archivo .env en la raíz del proyecto con las variables de Firebase
 * - Tener instalado dotenv: npm install dotenv
 *
 * CÓMO CORRER (PowerShell):
 *   $env:SEED_EMAIL="correo@ejemplo.com"; $env:SEED_PASSWORD="contraseña"; node seed.js
 * (Git Bash / Linux / Mac):
 *   SEED_EMAIL=correo@ejemplo.com SEED_PASSWORD=contraseña node seed.js
 */

require("dotenv").config({ path: ".env" });

const { randomUUID } = require("crypto");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, collection, addDoc, doc, setDoc, Timestamp } = require("firebase/firestore");

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

// UID del médico: se obtiene al iniciar sesión con SEED_EMAIL / SEED_PASSWORD (ver iniciarSesion).
let DOCTOR_ID = "";

async function iniciarSesion() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    throw new Error("Faltan las variables de entorno SEED_EMAIL y SEED_PASSWORD con las credenciales de la cuenta que se va a poblar.");
  }

  const credencial = await signInWithEmailAndPassword(getAuth(app), email, password);
  DOCTOR_ID = credencial.user.uid;
  console.log(`Sesión iniciada como ${email}`);
}

// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN: cambiá estos números según lo que necesitás
//  (poné 0 para no crear ese tipo de dato)
// ══════════════════════════════════════════════════════════════

// ── Pacientes y su historial clínico ──
const CANTIDAD_PACIENTES = 20;           // cuántos pacientes querés
const CONSULTAS_POR_PACIENTE = 10;       // cuántas consultas por paciente
const EXPEDIENTES_POR_PACIENTE = 1;      // registros de la colección "expedientes" por paciente
const DOCUMENTOS_POR_PACIENTE = 1;       // documentos adjuntos (PDF) por paciente

// ── Agenda (módulos Citas y Calendario) ──
const CITAS_POR_PACIENTE = 8;            // cuántas citas por paciente
const DIAS_CITAS_PASADAS = 180;          // las citas se reparten hasta N días atrás...
const DIAS_CITAS_FUTURAS = 45;           // ...y hasta N días hacia adelante

// ── Formularios clínicos ──
const CANTIDAD_FORMULARIOS = 6;          // cuántos formularios crear (máximo 8, el tamaño del catálogo)
const VERSIONES_POR_FORMULARIO = 2;      // 1 = sin historial; 2 o más crean versiones anteriores
const FORMULARIOS_COMO_PLANTILLA = 1;     // de los formularios anteriores, cuántos quedan como plantilla
const FORMULARIOS_ARCHIVADOS = 2;        // de los formularios anteriores, cuántos quedan archivados
const FORMULARIOS_RESPONDIDOS_POR_PACIENTE = 3;  // formularios distintos que responde cada paciente
const PORCENTAJE_CITAS_CON_FORMULARIO = 30;      // % de citas con un formulario asignado (0 a 100)

// ── Datos aleatorios ──
const NOMBRES = ["Carlos", "María", "Luis", "Ana", "Jorge", "Sofía", "Diego", "Valentina", "Andrés", "Natalia", "Roberto", "Paola", "Miguel", "Laura", "Esteban", "Fernando", "Gabriela", "Alejandro", "Isabella", "Sebastián", "Camila", "Daniel", "Valeria", "Mateo", "Lucía", "Ricardo", "Daniela", "Arturo", "Mariana", "Pablo", "Verónica", "Joaquín", "Adriana", "Marcos", "Rebeca", "Emilio", "Patricia", "Nicolás", "Jimena", "Raúl", "Silvia", "Héctor", "Mónica", "Iván", "Carla", "Óscar", "Yolanda", "Enrique", "Beatriz", "Sergio", "Claudia", "Víctor", "Irene", "Alfonso", "Nathalie", "Rodrigo", "Fabiola", "Ignacio", "Lorena", "Felipe", "Sandra", "Ernesto", "Rocío", "Germán", "Esmeralda", "Mauricio", "Alicia", "Tomás", "Pilar", "Ramón", "Esperanza", "Guillermo", "Miriam", "Álvaro", "Carmen", "Eduardo", "Teresa", "César", "Graciela", "Manuel", "Liliana", "Javier", "Estela", "Leonel", "Sonia", "Cristian", "Olga", "Hugo", "Norma", "Bernal", "Karina", "Rolando", "Wendy", "Wilberth", "Xinia", "Yorleny", "Zulay", "Aarón", "Brenda", "Gerardo", "Hazel"];

const APELLIDOS = ["González", "Mora", "Jiménez", "Rodríguez", "Castro", "Vargas", "Solano", "Pérez", "Méndez", "Araya", "Quesada", "Herrera", "Blanco", "Campos", "Núñez", "Rojas", "Chaves", "Arias", "Ramírez", "Vega", "Brenes", "Murillo", "Soto", "Monge", "Alvarado", "Esquivel", "Badilla", "Zamora", "Mata", "Navarro", "Ugalde", "Picado", "Portuguez", "Fonseca", "Gamboa", "Elizondo", "Salazar", "Calvo", "Benavides", "Cordero", "Corrales", "Acuña", "Bonilla", "Barrantes", "Salas", "Vindas", "Loría", "Cerdas", "Alfaro", "Valverde", "Segura", "Rivera", "Sandoval", "Quirós", "Pizarro", "Orozco", "Obando", "Naranjo", "López", "Leiva", "Lara", "Gutiérrez", "Guzmán", "Flores", "Espinoza", "Durán", "Delgado", "Cruz", "Coronado", "Conejo", "Cambronero", "Calderón", "Bolaños", "Arguedas", "Aguilar", "Zeledón", "Ulate", "Trejos", "Tovar", "Solís", "Sibaja", "Quesada", "Prado", "Porras", "Peralta", "Palma", "Ortiz", "Ocampo", "Nájera", "Miranda", "Marchena", "Madrigal", "Lobo", "León", "Jenkins", "Jiménez", "Hidalgo", "Garbanzo", "Fernández", "Esquivel", "Díaz", "Castillo"];

const SEXOS = ["masculino", "femenino"];

const GRUPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const ASEGURADORAS = ["INS", "Caja Costarricense de Seguro Social", "Mapfre", "Allianz", "Dotal", "Pan-American Life", "BMI", "Seguros del Magisterio", "Médico Salud", "Aseguradora del Istmo"];

const PROVINCIAS = ["San José", "Heredia", "Alajuela", "Cartago", "Guanacaste", "Puntarenas", "Limón", "Escazú", "Desamparados", "Tibás", "Moravia", "Montes de Oca", "Coronado", "Curridabat", "La Unión", "Tres Ríos", "San Carlos", "Grecia", "Atenas", "Palmares", "Naranjo", "Valverde Vega", "Upala", "Los Chiles", "Guatuso", "Liberia", "Nicoya", "Santa Cruz", "Bagaces", "Carrillo", "Cañas", "Abangares", "Tilarán", "Nandayure", "La Cruz", "Hojancha", "Puntarenas Centro", "Esparza", "Buenos Aires", "Montes de Oro", "Osa", "Quepos", "Golfito", "Coto Brus", "Parrita", "Corredores", "Garabito", "Limón Centro", "Pococí", "Siquirres", "Talamanca", "Matina", "Guácimo"];

const ALERGIAS_OPCIONES = ["Penicilina", "Ibuprofeno", "Aspirina", "Látex", "Polen", "Ácaros", "Mariscos", "Sulfas", "AINEs", "Ninguna conocida", "Amoxicilina", "Cefalosporinas", "Sulfonamidas", "Tetraciclinas", "Eritromicina", "Clindamicina", "Metronidazol", "Quinolonas", "Vancomicina", "Carbapenémicos", "Diclofenaco", "Naproxeno", "Ketorolaco", "Metamizol", "Paracetamol", "Codeína", "Morfina", "Tramadol", "Contraste yodado", "Gadolinio", "Anestesia local", "Lidocaína", "Bupivacaína", "Insulina", "Heparina", "Warfarina", "Metoclopramida", "Ondansetrón", "Ranitidina", "Omeprazol", "Leche de vaca", "Huevo", "Soya", "Trigo", "Cacahuate", "Nueces", "Pescado", "Frutas cítricas", "Plátano", "Aguacate", "Níquel", "Cromo", "Colorantes artificiales", "Conservantes", "Alcohol", "Cafeína", "Polvo doméstico", "Mohos", "Epitelio de gato", "Epitelio de perro", "Cucaracha", "Veneno de abeja", "Veneno de avispa", "Formaldehído", "Parabenos", "Lanolina", "Fragancias", "Mercurio", "Fluoruro", "Glucosamina", "Condroitina", "Vitamina C en altas dosis", "Vitamina E", "Ginkgo biloba", "Echinacea", "Ajo en suplemento", "Jengibre", "Cúrcuma", "Propóleo", "Aloe vera tópico", "Aceite de árbol de té", "Lavanda", "Menta", "Eucalipto", "Canela", "Clavo", "Pimienta", "Pimentón", "Apio", "Zanahoria", "Mostaza", "Sésamo", "Altramuz", "Moluscos", "Crustáceos", "Gelatina", "Colorante rojo 40", "Tartrazina", "Benzoatos", "Sulfitos", "Glutamato monosódico", "Aspartamo", "Sacarina"];

const MEDICAMENTOS_OPCIONES = ["Enalapril 10mg", "Metformina 500mg", "Atorvastatina 20mg", "Losartán 50mg", "Omeprazol 20mg", "Loratadina 10mg", "Fluoxetina 20mg", "Amlodipino 5mg", "Metformina 850mg", "Metformina 1000mg", "Glibenclamida 5mg", "Glipizida 5mg", "Insulina glargina 20U", "Insulina NPH 20U", "Insulina lispro", "Sitagliptina 100mg", "Empagliflozina 10mg", "Enalapril 5mg", "Enalapril 20mg", "Lisinopril 10mg", "Lisinopril 20mg", "Ramipril 5mg", "Captopril 25mg", "Losartán 100mg", "Valsartán 80mg", "Irbesartán 150mg", "Amlodipino 10mg", "Nifedipino 30mg", "Diltiazem 60mg", "Verapamilo 80mg", "Atenolol 50mg", "Metoprolol 50mg", "Bisoprolol 5mg", "Carvedilol 6.25mg", "Propranolol 40mg", "Furosemida 40mg", "Hidroclorotiazida 25mg", "Espironolactona 25mg", "Atorvastatina 40mg", "Atorvastatina 80mg", "Rosuvastatina 10mg", "Rosuvastatina 20mg", "Simvastatina 20mg", "Omeprazol 40mg", "Pantoprazol 40mg", "Esomeprazol 40mg", "Lansoprazol 30mg", "Ranitidina 150mg", "Sucralfato 1g", "Metoclopramida 10mg", "Domperidona 10mg", "Ondansetrón 8mg", "Loratadina 5mg", "Cetirizina 10mg", "Fexofenadina 120mg", "Desloratadina 5mg", "Montelukast 10mg", "Salbutamol inhalado", "Beclometasona inhalada", "Budesonida inhalada", "Fluticasona inhalada", "Tiotropio inhalado", "Ipratropio inhalado", "Fluoxetina 40mg", "Sertralina 50mg", "Sertralina 100mg", "Escitalopram 10mg", "Paroxetina 20mg", "Venlafaxina 75mg", "Alprazolam 0.5mg", "Clonazepam 0.5mg", "Diazepam 5mg", "Amitriptilina 25mg", "Levotiroxina 50mcg", "Levotiroxina 100mcg", "Metimazol 10mg", "Aspirina 81mg", "Clopidogrel 75mg", "Warfarina 5mg", "Rivaroxabán 20mg", "Apixabán 5mg", "Paracetamol 500mg", "Ibuprofeno 400mg", "Naproxeno 500mg", "Diclofenaco 50mg", "Celecoxib 200mg", "Tramadol 50mg", "Amoxicilina 500mg", "Amoxicilina-clavulanato 875mg", "Azitromicina 500mg", "Claritromicina 500mg", "Ciprofloxacino 500mg", "Trimetoprim-sulfametoxazol", "Metronidazol 500mg", "Doxiciclina 100mg", "Nitrofurantoína 100mg", "Aciclovir 400mg", "Fluconazol 150mg", "Hierro sulfato 325mg", "Ácido fólico 5mg", "Vitamina D3 1000UI", "Calcio carbonato 500mg", "Vitamina B12 1000mcg"];

const TAGS_OPCIONES = ["Hipertensión", "Diabetes", "Asma", "Migraña", "Colesterol", "Gastritis", "Alergia", "Control mensual", "Alto riesgo", "Salud mental", "Primera vez", "Cardiopatía", "Hipotiroidismo", "Hipertiroidismo", "Obesidad", "Sobrepeso", "Anemia", "Artritis", "Osteoporosis", "Insuficiencia renal", "Insuficiencia cardíaca", "EPOC", "Fibromialgia", "Lupus", "Psoriasis", "Epilepsia", "Alzheimer", "Parkinson", "Depresión", "Ansiedad", "Trastorno bipolar", "Esquizofrenia", "TDAH", "Autismo", "VIH", "Hepatitis B", "Hepatitis C", "Cirrosis", "Cáncer en remisión", "Quimioterapia", "Radioterapia", "Post-quirúrgico", "Embarazo", "Lactancia", "Menopausia", "Andropausia", "Pediatría", "Geriatría", "Discapacidad motora", "Discapacidad visual", "Discapacidad auditiva", "Trasplante renal", "Trasplante hepático", "Diálisis", "Oxigenoterapia", "Nutrición parenteral", "Sonda nasogástrica", "Traqueostomía", "Colostomía", "Marcapasos", "Desfibrilador implantable", "Prótesis articular", "Control trimestral", "Control semestral", "Control anual", "Seguimiento", "Urgencia recurrente", "Paciente complejo", "Multimorbilidad", "Politratado", "Fumador", "Ex fumador", "Alcoholismo", "Drogadicción en recuperación", "Sedentarismo", "Deportista", "Viajero frecuente", "Trabajador nocturno", "Estrés laboral", "Violencia doméstica", "Adulto mayor frágil", "Cuidado paliativo", "Enfermedad terminal", "DNR", "Voluntad anticipada", "Sin seguro", "CCSS", "INS", "Seguro privado", "Sin medicamentos", "Polifarmacia", "Alergia medicamentosa", "Intolerancia medicamentosa", "Reacción adversa previa", "Vacunas al día", "Vacunas pendientes", "Tamizaje pendiente", "Mamografía pendiente", "Papanicolau pendiente", "Colonoscopía pendiente"];

const MOTIVOS_CONSULTA = ["Control mensual de rutina", "Dolor de cabeza persistente", "Fiebre y malestar general", "Control de presión arterial", "Revisión de exámenes de laboratorio", "Dolor abdominal", "Tos y congestión nasal", "Control de diabetes", "Mareos y náuseas", "Revisión postoperatoria", "Dolor de espalda baja", "Cansancio y fatiga crónica", "Pérdida de peso inexplicable", "Aumento de peso súbito", "Dificultad para dormir", "Ansiedad y nerviosismo", "Tristeza y decaimiento", "Dolor en articulaciones", "Hinchazón de piernas", "Palpitaciones cardíacas", "Dolor en el pecho", "Dificultad para respirar", "Tos con flema", "Dolor de garganta", "Infección urinaria", "Ardor al orinar", "Sangrado anormal", "Irregularidad menstrual", "Flujo vaginal anormal", "Control prenatal", "Revisión ginecológica", "Dolor de oído", "Pérdida de audición", "Visión borrosa", "Ojo rojo", "Erupciones en la piel", "Picazón generalizada", "Úlcera en boca", "Sangrado de encías", "Dolor dental", "Entumecimiento en extremidades", "Calambres musculares", "Temblores", "Desmayo o pérdida de conciencia", "Convulsiones", "Pérdida de memoria", "Confusión mental", "Cambios en el estado de ánimo", "Agresividad o irritabilidad", "Alucinaciones", "Control de colesterol", "Control de tiroides", "Control de anticoagulación", "Ajuste de medicamentos", "Segunda opinión médica", "Certificado médico", "Incapacidad laboral", "Vacunación", "Desparasitación", "Control de niño sano", "Evaluación nutricional", "Control de obesidad", "Revisión de herida", "Curación de herida", "Retiro de puntos", "Control de úlcera varicosa", "Dolor neuropático", "Síndrome de piernas inquietas", "Apnea del sueño", "Ronquidos", "Reflujo gastroesofágico", "Estreñimiento crónico", "Diarrea persistente", "Sangre en heces", "Hemorroides", "Hernias", "Cálculos renales", "Cálculos biliares", "Ictericia", "Hígado graso", "Pancreatitis", "Colitis", "Enfermedad de Crohn", "Síndrome de intestino irritable", "Gastroenteritis aguda", "Intoxicación alimentaria", "Reacción alérgica", "Urticaria", "Angioedema", "Choque anafiláctico leve", "Mordedura de animal", "Accidente con objeto cortante", "Quemadura", "Contusión", "Esguince", "Fractura sospechada", "Revisión de radiografía", "Revisión de resonancia magnética", "Revisión de tomografía", "Resultado de biopsia", "Seguimiento oncológico", "Control de quimioterapia", "Control de VIH", "Control de hepatitis", "Evaluación preoperatoria", "Evaluación pre-anestésica"];

const EXAMENES_FISICOS = [
  "PA: 120/80 mmHg, FC: 72 lpm, FR: 16 rpm, T: 36.5°C, peso 70kg. Paciente en buen estado general, consciente y orientado.",
  "PA: 145/90 mmHg, FC: 85 lpm, FR: 18 rpm, T: 36.8°C. Paciente refiere cefalea ocasional. Pupilas isocóricas reactivas.",
  "Temperatura 38.2°C, FR: 22 rpm, FC: 96 lpm. Faringe levemente eritematosa. Ganglios cervicales palpables.",
  "Glucemia capilar: 145 mg/dL. PA: 130/85 mmHg, peso 88kg, IMC 28.5. Abdomen blando sin masas palpables.",
  "SatO2: 97%, FR: 18 rpm. Auscultación pulmonar con murmullo vesicular conservado. Sin signos de alarma.",
  "PA: 110/70 mmHg, FC: 68 lpm, T: 36.3°C, peso 58kg. Mucosas húmedas. Buena perfusión periférica.",
  "PA: 160/100 mmHg, FC: 92 lpm. Paciente ansioso. Fondo de ojo sin hallazgos patológicos agudos.",
  "T: 37.8°C, FC: 88 lpm, FR: 20 rpm. Orofaringe con exudado blanquecino. Amígdalas hiperémicas.",
  "PA: 125/82 mmHg, peso 92kg, talla 1.72m, IMC 31.1. Abdomen con obesidad central. Sin edemas.",
  "SatO2: 94%, FR: 24 rpm. Sibilancias bilaterales a la auscultación. Uso leve de músculos accesorios.",
  "PA: 118/76 mmHg, FC: 74 lpm. Piel sin lesiones. Articulaciones sin edema ni rubor. Movilidad conservada.",
  "T: 38.9°C, FC: 102 lpm, FR: 22 rpm. Paciente diaforético. Abdomen con dolor en fosa iliaca derecha.",
  "PA: 135/88 mmHg, FC: 80 lpm, peso 76kg. Edemas bimaleolares ++. Ingurgitación yugular leve.",
  "Glucemia: 210 mg/dL, PA: 148/92 mmHg. Pie derecho con hiperqueratosis plantar. Sin úlceras activas.",
  "PA: 100/65 mmHg, FC: 110 lpm. Paciente pálido y sudoroso. Mucosas secas. Llenado capilar 3 segundos.",
  "T: 36.7°C, PA: 122/78 mmHg. Neurológico: sin déficit focal. Marcha sin alteraciones. Romberg negativo.",
  "PA: 138/86 mmHg, FC: 76 lpm. Tiroides sin bocio palpable. Reflejos osteotendinosos normales.",
  "Peso 55kg, talla 1.60m, IMC 21.5. PA: 108/68 mmHg. Paciente delgada, palidez conjuntival leve.",
  "FC: 78 lpm, ritmo regular. Ruidos cardíacos normales sin soplos. PA: 128/82 mmHg. Sin cardiomegalia clínica.",
  "T: 37.2°C, PA: 132/84 mmHg. Abdomen con peristaltismo aumentado. Dolor difuso a la palpación superficial.",
  "SatO2: 98%, PA: 115/72 mmHg, FC: 70 lpm. Auscultación cardiopulmonar normal. Abdomen sin hallazgos.",
  "PA: 150/95 mmHg, FC: 88 lpm. Fondo de ojo con cambios hipertensivos grado I. Papila bien delimitada.",
  "T: 38.5°C, FC: 94 lpm. Otoscopia: membrana timpánica eritematosa con pérdida del reflejo luminoso derecho.",
  "PA: 126/80 mmHg, peso 83kg. Cicatriz quirúrgica en buen estado. Sin signos de infección local.",
  "FC: 68 lpm, ritmo regular. PA: 118/74 mmHg. Paciente en buen estado general. Sin adenopatías palpables.",
  "T: 37.5°C, FR: 19 rpm. Faringe con mucosidad posterior. Ganglios submandibulares sensibles al tacto.",
  "PA: 142/88 mmHg, FC: 82 lpm. Extremidades inferiores con varices grado II. Edema vespertino leve.",
  "Glucemia: 98 mg/dL, PA: 112/70 mmHg, peso 64kg. Paciente euglucémica. Sin alteraciones al examen.",
  "T: 36.9°C, PA: 130/80 mmHg. Piel con eritema malar. Articulaciones interfalángicas con leve edema.",
  "PA: 119/76 mmHg, FC: 72 lpm, SatO2: 99%. Auscultación pulmonar normal. Abdomen blando depresible.",
  "FC: 86 lpm, PA: 136/86 mmHg. Paciente con obesidad mórbida, IMC 38. Estrías abdominales presentes.",
  "T: 38.1°C, FC: 90 lpm. Exantema maculopapular en tronco y extremidades. Sin afectación palmoplantar.",
  "PA: 108/66 mmHg, FC: 64 lpm, peso 52kg. Paciente asténica. Cabello seco y quebradizo. Piel reseca.",
  "SatO2: 96%, FR: 21 rpm, T: 37.8°C. Crepitantes basales bilaterales a la auscultación pulmonar.",
  "PA: 124/78 mmHg, FC: 76 lpm. Abdomen con cicatriz de apendicectomía. Sin masas. Ruidos presentes.",
  "T: 39.1°C, FC: 108 lpm, FR: 24 rpm. Paciente con rigidez de nuca leve. Fotofobia presente.",
  "PA: 144/90 mmHg, peso 95kg, IMC 32.4. Circunferencia abdominal 102cm. Sin edemas periféricos.",
  "FC: 74 lpm, ritmo irregular. PA: 132/82 mmHg. Pulso irregular. Sin soplos cardíacos audibles.",
  "T: 36.6°C, PA: 116/72 mmHg. Examen ginecológico: útero en anteversión sin masas anexiales.",
  "PA: 128/84 mmHg, FC: 80 lpm. Rodilla derecha con derrame articular moderado. Movilidad limitada por dolor.",
  "SatO2: 95%, FR: 23 rpm. Tiraje intercostal leve. Sibilancias espiratorias difusas. FC: 96 lpm.",
  "T: 37.3°C, PA: 122/76 mmHg. Piel con placas eritematosas descamativas en codos y cuero cabelludo.",
  "PA: 156/98 mmHg, FC: 90 lpm. Fondo de ojo con exudados duros y hemorragias en llama grado II.",
  "Peso 48kg, talla 1.58m, IMC 19.2. PA: 100/62 mmHg. Paciente con bajo peso. Mucosas pálidas.",
  "FC: 70 lpm, PA: 120/78 mmHg. Cicatriz de bypass en buen estado. Pulsos periféricos conservados.",
  "T: 38.3°C, FC: 92 lpm. Herida quirúrgica con signos leves de inflamación. Sin secreción purulenta.",
  "PA: 134/86 mmHg, peso 79kg. Temblor fino en manos en reposo. Rigidez en rueda dentada bilateral.",
  "SatO2: 93%, FR: 26 rpm, FC: 104 lpm. Uso de músculos accesorios. Murmullo vesicular disminuido.",
  "T: 36.8°C, PA: 114/70 mmHg. Examen neurológico normal. Fuerza muscular 5/5 en cuatro extremidades.",
  "PA: 140/88 mmHg, FC: 84 lpm. Abdomen con hepatomegalia de 2cm por debajo del reborde costal.",
  "T: 37.6°C, FC: 88 lpm. Ojos con conjuntivas eritematosas y secreción mucopurulenta bilateral.",
  "PA: 122/80 mmHg, peso 68kg. Piel con urticaria generalizada. Angioedema labial leve presente.",
  "FC: 66 lpm, PA: 110/68 mmHg. Paciente en buen estado. Ganglios inguinales palpables no dolorosos.",
  "T: 37.4°C, PA: 126/82 mmHg. Abdomen con dolor en hipocondrio derecho a la palpación. Murphy positivo.",
  "PA: 148/94 mmHg, FC: 86 lpm, SatO2: 97%. Extremidades sin edema. Pulsos simétricos presentes.",
  "Peso 102kg, talla 1.68m, IMC 36.1. PA: 150/96 mmHg, FC: 88 lpm. Acantosis nigricans en cuello.",
  "T: 36.5°C, FC: 72 lpm. Piel sin lesiones activas. Cicatrices de episodios previos en brazos.",
  "PA: 116/72 mmHg, FC: 68 lpm. Paciente gestante de 28 semanas. FCF: 148 lpm. Altura uterina 28cm.",
  "T: 38.7°C, FC: 100 lpm. Abdomen con dolor difuso y defensa muscular voluntaria. Blumberg dudoso.",
  "PA: 132/86 mmHg, peso 74kg. Columna lumbar con limitación de flexión anterior por dolor. Lasègue positivo.",
  "SatO2: 98%, FC: 72 lpm, PA: 118/76 mmHg. Paciente asintomático. Examen físico sin alteraciones.",
  "T: 37.1°C, PA: 128/80 mmHg. Cuello con bocio difuso grado II. Sin nódulos palpables. Sin soplo.",
  "PA: 146/92 mmHg, FC: 82 lpm. Retina con neovascularización. Signos de retinopatía diabética proliferativa.",
  "Peso 61kg, talla 1.65m, IMC 22.4. PA: 112/72 mmHg. Examen completo sin hallazgos patológicos.",
  "T: 38.4°C, FC: 96 lpm. Pabellón auricular eritematoso y doloroso. Trago doloroso. Otorrea leve.",
  "PA: 136/88 mmHg, FC: 78 lpm. Várices esofágicas no visibles. Ascitis leve por percusión.",
  "SatO2: 96%, FR: 20 rpm, T: 36.9°C. Tórax con deformidad en tonel. Espiración prolongada.",
  "PA: 120/76 mmHg, FC: 74 lpm. Paciente post-cesárea. Herida limpia. Involución uterina adecuada.",
  "T: 37.2°C, PA: 124/80 mmHg. Hombro derecho con limitación de abducción activa. Maniobra de Neer positiva.",
  "FC: 76 lpm, PA: 130/82 mmHg. Abdomen con esplenomegalia leve. Hígado de tamaño normal.",
  "T: 38.0°C, FC: 92 lpm. Lesión vesiculosa en labio superior compatible con herpes labial activo.",
  "PA: 138/84 mmHg, peso 85kg. Tobillo izquierdo con equimosis y edema. Dolor a la palpación del peroné.",
  "SatO2: 97%, PA: 118/74 mmHg. Examen neurológico: leve bradipsiquia. Sin déficit motor ni sensitivo.",
  "T: 36.7°C, FC: 70 lpm, PA: 114/70 mmHg. Paciente pediátrico en buen estado. Tanner II.",
  "PA: 152/96 mmHg, FC: 88 lpm. Pulsos femorales débiles. Soplo sistólico en foco aórtico grado II/VI.",
  "T: 37.9°C, FC: 94 lpm. Úlcera plantar derecha de 2x2cm con tejido de granulación. Sin signos de celulitis.",
  "PA: 126/80 mmHg, peso 71kg. Palpación abdominal: masa en fosa iliaca derecha. Peristaltismo presente.",
  "FC: 64 lpm, PA: 108/66 mmHg. Paciente anciana de 82 años. Marcha lenta con apoyo. Talla disminuida.",
  "T: 38.6°C, FR: 23 rpm, FC: 98 lpm. Matidez en base pulmonar derecha. Soplo tubárico presente.",
  "PA: 142/90 mmHg, FC: 80 lpm. Hematoma subdural crónico en TC previo. Sin signos focales actuales.",
  "SatO2: 99%, T: 36.4°C, FC: 68 lpm, PA: 116/72 mmHg. Paciente en excelente estado general.",
  "T: 37.6°C, PA: 130/84 mmHg. Lesiones de psoriasis en placas en codos, rodillas y cuero cabelludo.",
  "PA: 140/86 mmHg, FC: 84 lpm. Manos con deformidad en ráfaga cubital. Nódulos de Bouchard presentes.",
  "Peso 44kg, talla 1.62m, IMC 16.8. PA: 96/60 mmHg. Paciente caquéctica. Edema periorbital leve.",
  "T: 38.2°C, FC: 90 lpm. Abdomen con signo de Rovsing positivo. Dolor intenso en fosa iliaca derecha.",
  "PA: 128/82 mmHg, FC: 76 lpm, SatO2: 98%. Cicatriz de toracotomía izquierda. Sin alteraciones actuales.",
  "T: 37.3°C, PA: 120/78 mmHg. Cuello con adenopatías laterocervicales múltiples de consistencia firme.",
  "FC: 72 lpm, PA: 122/76 mmHg. Paciente post-trasplante renal. Injerto sin dolor. Función conservada.",
  "T: 38.8°C, FC: 104 lpm, FR: 25 rpm. Deterioro del estado general. Glasgow 14/15. Taquipnea.",
  "PA: 134/88 mmHg, peso 80kg. Abdomen con estrías violáceas. Giba dorsal. Cara en luna llena.",
  "SatO2: 95%, FR: 22 rpm. Paciente con traqueostomía funcional. Pulmones con crepitantes leves.",
  "T: 36.8°C, PA: 118/74 mmHg. Examen dermatológico: acné nodular en cara y espalda. Sin cicatrices queloides.",
  "FC: 78 lpm, PA: 132/84 mmHg. Próstata aumentada de tamaño al tacto rectal. Superficie regular.",
  "T: 37.5°C, FC: 86 lpm. Muñeca derecha con edema y dolor a la dorsiflexión. Test de Phalen positivo.",
  "PA: 144/92 mmHg, FC: 82 lpm. Retinopatía hipertensiva grado III. Papila con borramiento de bordes.",
  "Peso 78kg, talla 1.70m, IMC 27.0. PA: 128/80 mmHg, FC: 74 lpm. Paciente en normopeso relativo.",
  "T: 38.3°C, FC: 96 lpm. Articulación metatarsofalángica del 1er dedo eritematosa, caliente y muy dolorosa.",
  "PA: 116/70 mmHg, FC: 66 lpm. Paciente atleta. Examen cardiopulmonar normal. SatO2: 99%.",
  "T: 37.0°C, PA: 120/76 mmHg. Examen oftalmológico: catarata nuclear bilateral. AV reducida.",
];

const DIAGNOSTICOS_OPCIONES = ["Hipertensión arterial esencial", "Diabetes mellitus tipo 2", "Infección respiratoria alta", "Gastritis crónica", "Cefalea tensional", "Rinitis alérgica", "Ansiedad generalizada", "Hipotiroidismo", "Asma bronquial leve", "Diabetes mellitus tipo 1", "Hipertensión arterial no controlada", "Diabetes mellitus tipo 2 descompensada", "Insuficiencia cardíaca congestiva", "Cardiopatía isquémica crónica", "Infarto agudo al miocardio previo", "Fibrilación auricular", "Arritmia supraventricular", "Taquicardia sinusal", "Bradicardia sinusal", "Bloqueo auriculoventricular", "Enfermedad pulmonar obstructiva crónica", "Asma bronquial moderada", "Asma bronquial severa", "Neumonía adquirida en comunidad", "Bronquitis aguda", "Bronquiectasias", "Tuberculosis pulmonar", "Derrame pleural", "Embolia pulmonar", "Apnea obstructiva del sueño", "Gastritis aguda", "Úlcera péptica", "Reflujo gastroesofágico", "Síndrome de intestino irritable", "Enfermedad de Crohn", "Colitis ulcerosa", "Pancreatitis aguda", "Colelitiasis", "Colecistitis aguda", "Hepatitis viral aguda", "Cirrosis hepática", "Hígado graso no alcohólico", "Insuficiencia renal crónica", "Infección del tracto urinario", "Pielonefritis aguda", "Litiasis renal", "Síndrome nefrótico", "Hiperplasia prostática benigna", "Disfunción eréctil", "Infertilidad masculina", "Migraña sin aura", "Migraña con aura", "Cefalea en racimos", "Cefalea por uso excesivo de analgésicos", "Epilepsia", "Accidente cerebrovascular isquémico", "Hemorragia cerebral", "Enfermedad de Parkinson", "Alzheimer", "Demencia vascular", "Esclerosis múltiple", "Neuropatía diabética", "Polineuropatía periférica", "Síndrome del túnel carpiano", "Lumbago agudo", "Lumbalgia crónica", "Hernia discal lumbar", "Estenosis del canal lumbar", "Fibromialgia", "Artritis reumatoide", "Osteoartritis de rodilla", "Osteoartritis de cadera", "Osteoporosis", "Gota", "Lupus eritematoso sistémico", "Síndrome de Sjögren", "Hipotiroidismo primario", "Hipertiroidismo", "Tiroiditis de Hashimoto", "Bocio nodular", "Síndrome de Cushing", "Insuficiencia suprarrenal", "Anemia ferropénica", "Anemia por deficiencia de B12", "Anemia aplásica", "Trombocitopenia", "Leucemia", "Linfoma", "Mieloma múltiple", "Depresión mayor", "Trastorno bipolar tipo I", "Trastorno bipolar tipo II", "Trastorno de ansiedad generalizada", "Trastorno de pánico", "Fobia social", "TEPT", "TOC", "Esquizofrenia", "Trastorno esquizoafectivo", "TDAH", "Insomnio crónico", "Dermatitis atópica", "Psoriasis en placas", "Rosácea", "Acné vulgar", "Urticaria crónica", "Melanoma", "Carcinoma basocelular", "VIH controlado", "Sífilis", "Gonorrea", "Clamidia", "Herpes genital", "Virus del papiloma humano"];

const TRATAMIENTOS = ["Continuar tratamiento actual sin cambios", "Ajuste de dosis según respuesta clínica", "Reposo relativo por 3 días", "Antibiótico por 7 días según antibiograma", "Antiinflamatorio por 5 días con protección gástrica", "Control en 15 días con exámenes de laboratorio", "Iniciar nuevo medicamento y evaluar tolerancia", "Suspender medicamento por efectos adversos", "Referir a especialista para manejo conjunto", "Hospitalización para estudio y tratamiento", "Manejo ambulatorio con seguimiento estrecho", "Cambio de esquema terapéutico por falta de respuesta", "Agregar segundo agente antihipertensivo", "Intensificar control glucémico con insulina", "Iniciar terapia con estatinas", "Agregar antiagregante plaquetario", "Iniciar anticoagulación oral", "Fisioterapia y rehabilitación por 8 semanas", "Psicoterapia cognitivo-conductual", "Terapia ocupacional", "Dieta hipocalórica supervisada por nutricionista", "Programa de ejercicio aeróbico supervisado", "Cirugía programada en próximas semanas", "Procedimiento ambulatorio bajo anestesia local", "Infiltración corticoesteroide en articulación", "Nebulización broncodilatadora", "Oxigenoterapia domiciliaria", "Terapia de reemplazo hormonal", "Quimioterapia según protocolo oncológico", "Radioterapia paliativa", "Cuidados paliativos y manejo del dolor", "Tratamiento tópico con corticosteroide", "Fototerapia para dermatosis", "Diálisis peritoneal o hemodiálisis según indicación", "Trasplante de órgano en lista de espera", "Vacunación según esquema nacional", "Desensibilización alérgica", "Programa de deshabituación tabáquica", "Programa de desintoxicación alcohólica", "Manejo nutricional con suplementación", "Sonda nasogástrica para alimentación enteral", "Nutrición parenteral total", "Curación y desbridamiento de herida crónica", "Inmovilización con férula o yeso", "Tracción esquelética", "Drenaje de absceso", "Biopsia de lesión sospechosa", "Endoscopia diagnóstica y terapéutica", "Colonoscopia con polipectomía", "Ultrasonido terapéutico", "TENS para manejo del dolor crónico", "Acupuntura como terapia complementaria", "Meditación y técnicas de relajación", "Hidratación intravenosa y reposición electrolítica", "Transfusión sanguínea según indicación", "Plasmaféresis terapéutica", "Inmunoglobulina intravenosa", "Inmunosupresión con corticosteroide sistémico", "Terapia biológica según protocolo", "Mantenimiento con medicamento de por vida", "Alta médica con control en caso necesario"];

const INDICACIONES = ["Dieta baja en sodio y grasas saturadas", "Hidratación abundante con agua pura", "Evitar estrés y actividad física intensa", "Tomar medicamento con el desayuno sin omitir dosis", "Control en casa dos veces al día con tensiómetro propio", "Consultar si los síntomas empeoran o no mejoran en 48 horas", "Ayuno de 8 horas para exámenes de laboratorio", "No conducir vehículos mientras tome sedantes", "Evitar alcohol y tabaco durante el tratamiento", "Completar el esquema antibiótico aunque mejore antes", "Aplicar hielo en la zona afectada 20 minutos tres veces al día", "Elevar la extremidad afectada para reducir el edema", "Usar calzado cómodo y de puntera amplia", "Revisar los pies diariamente y reportar cualquier herida", "No caminar descalzo en ningún momento del día", "Mantener la herida limpia y seca hasta próxima revisión", "Cambiar el apósito según indicación de enfermería", "Asistir a sesiones de fisioterapia según agenda programada", "Tomar el sol con protector solar factor 50 o mayor", "Hidratación cutánea con crema emoliente dos veces al día", "Dieta blanda y fácil digestión por 5 días", "No hacer esfuerzos físicos por 4 semanas postcirugía", "Seguimiento con cardiología en 30 días con electrocardiograma", "Realizar espirometría en próxima cita neumológica", "Traer exámenes de laboratorio en próxima cita médica", "Control de glucemia capilar antes del desayuno y cena", "Registrar lecturas de presión arterial en bitácora diaria", "Seguir dieta mediterránea según indicaciones de nutricionista", "Iniciar caminata de 30 minutos diarios cinco días a la semana", "Reducir consumo de carbohidratos simples y azúcares", "Evitar alimentos procesados, embutidos y enlatados", "Aumentar consumo de fibra con frutas y verduras frescas", "Consumir al menos 2 litros de agua diarios", "Reducir consumo de cafeína a máximo una taza diaria", "Evitar posiciones prolongadas de pie o sentado", "Realizar ejercicios de estiramiento lumbar dos veces al día", "Dormir en posición lateral con almohada entre las rodillas", "Aplicar calor local en zona de contractura muscular", "Usar faja lumbar solo en actividades de esfuerzo", "Hacer reposo absoluto en cama por 48 horas", "Volver a urgencias si presenta fiebre mayor de 38.5°C", "Consultar si hay sangrado, disnea o dolor precordial", "No suspender el medicamento sin consultar al médico", "Guardar los medicamentos en lugar fresco y seco", "Llevar lista de medicamentos actuales a toda cita médica", "Usar inhalador de rescate solo en caso de crisis", "Enjuagar la boca con agua tras usar inhalador de corticoide", "Evitar exposición a humo de cigarro y contaminantes", "Usar mascarilla en ambientes con polvo o químicos", "Lavado de manos frecuente con agua y jabón", "Desinfectar superficies del hogar regularmente", "Ventilar bien los espacios interiores del hogar", "Evitar contacto con personas con enfermedades respiratorias", "Mantener vacunas al día según esquema nacional", "Asistir a control nutricional en próximos 15 días", "Referencia a psicología para manejo emocional", "Apoyo familiar en el cumplimiento del tratamiento", "Evitar situaciones de riesgo para recaída", "Abstinencia total de alcohol por indicación médica", "Participar en grupo de apoyo para su condición", "No automedicarse ni cambiar dosis sin consultar", "Seguir programa de rehabilitación cardiaca", "Monitoreo de peso diario y reporte si aumenta más de 2kg", "Restricción hídrica según indicación nefrológica", "Dieta renal baja en potasio, fósforo y proteínas", "Cuidado de acceso vascular para diálisis", "Protección solar estricta en área de radioterapia", "Higiene oral con pasta fluorada dos veces al día", "Visita odontológica preventiva cada 6 meses", "Tamizaje de cáncer de mama según protocolo", "Papanicolau según recomendación ginecológica", "Colonoscopia preventiva según indicación", "Densitometría ósea en próximos 3 meses"];

const NOTAS_CLINICAS = ["Paciente colaborador, comprende y acepta las indicaciones médicas.", "Se refiere a especialista para manejo conjunto de la patología.", "Buen control de la enfermedad desde la última visita hace 3 meses.", "Paciente refiere alto nivel de estrés laboral como factor desencadenante.", "Sin cambios significativos respecto a la consulta anterior.", "Paciente presenta buena adherencia al tratamiento farmacológico.", "Se detecta abandono del tratamiento por efectos secundarios. Se ajusta esquema.", "Paciente expresa preocupación por diagnóstico. Se brinda consejería y apoyo.", "Se realizó educación sobre reconocimiento de signos de alarma.", "Paciente llega acompañado por familiar que confirma los síntomas referidos.", "Se solicitan exámenes de laboratorio para control rutinario.", "Resultados de laboratorio previos dentro de rangos normales.", "Paciente con exámenes alterados. Se modifica tratamiento según resultado.", "Se realiza electrocardiograma en consultorio. Sin hallazgos agudos.", "Se aplica vacuna antigripal y antitetánica según esquema nacional.", "Paciente refiere mejoría del 70% desde el inicio del tratamiento.", "Sin eventos adversos reportados con el medicamento actual.", "Paciente con dificultad para costear los medicamentos. Se busca alternativa genérica.", "Se coordina con trabajo social para apoyo económico al paciente.", "Paciente asistió solo, sin red de apoyo familiar evidente.", "Se documenta consentimiento informado para procedimiento.", "Paciente firmó rechazo voluntario de hospitalización.", "Se informa al paciente sobre naturaleza crónica de su enfermedad.", "Consulta de seguimiento post-alta hospitalaria. Evolución favorable.", "Paciente referido por médico de EBAIS por descompensación.", "Se documenta comunicación con especialista vía interconsulta.", "Paciente con comorbilidades múltiples. Manejo interdisciplinario necesario.", "Se realiza ajuste de medicamento por interacción medicamentosa detectada.", "Paciente con historial de múltiples ingresos por misma causa.", "Paciente viaja al extranjero próximamente. Se ajusta plan de seguimiento.", "Paciente refiere cumplimiento del 80% de las indicaciones previas.", "Se observa mejoría en el control metabólico respecto a visita anterior.", "Paciente con deterioro funcional progresivo. Se evalúa necesidad de apoyo.", "Se explica al paciente importancia de no suspender tratamiento bruscamente.", "Consulta motivada por cambio de medicamento sugerido por farmacia.", "Paciente en duelo reciente. Se considera impacto emocional en la salud.", "Se detecta posible reacción adversa al medicamento. Se notifica a farmacovigilancia.", "Paciente pediátrico bien desarrollado para la edad. Padres tranquilizados.", "Adolescente con problemas de adherencia. Se negocia plan personalizado.", "Adulto mayor con polifarmacia. Se realiza revisión completa de medicamentos.", "Paciente embarazada. Se ajustan medicamentos seguros para gestación.", "Período postparto. Evolución normal. Lactancia materna establecida.", "Se documenta violencia intrafamiliar. Se activa protocolo de protección.", "Paciente con limitación cognitiva. Explicación dirigida al cuidador principal.", "Se realizó examen físico completo sin hallazgos de alarma.", "Paciente con dolor crónico bien manejado con esquema actual.", "Se introduce nueva terapia biológica. Consentimiento informado firmado.", "Paciente en lista de espera para cirugía. Se mantiene tratamiento conservador.", "Recuperación postquirúrgica dentro de los parámetros esperados.", "Se detectan signos de desnutrición. Se refiere a nutricionista urgente.", "Paciente fumador activo. Se ofrece programa de cesación tabáquica.", "Paciente con consumo riesgoso de alcohol. Se aplica tamizaje AUDIT.", "Se recomienda actividad física regular adaptada a la condición del paciente.", "Paciente con sedentarismo marcado. Se motiva al cambio de estilo de vida.", "Trabajo social documentó condiciones de vivienda precarias.", "Paciente inmigrante sin documentos. Se garantiza atención sin discriminación.", "Barrera idiomática presente. Se utilizó intérprete para la consulta.", "Se realizó lectura de prueba de tuberculina. Resultado negativo.", "Cultivo de orina pendiente. Se da tratamiento empírico mientras espera.", "Biopsia de piel enviada a patología. Se espera resultado en 10 días.", "Imagen de resonancia magnética programada para próximas dos semanas.", "Seguimiento oncológico sin evidencia de recurrencia por el momento.", "Paciente en cuidados paliativos con buena calidad de vida.", "Familia informada sobre pronóstico. Decisiones de tratamiento acordadas.", "Se documenta voluntad anticipada del paciente en el expediente.", "Paciente solicita segunda opinión médica. Se respeta su decisión.", "Consulta telefónica de seguimiento realizada sin necesidad de visita.", "Teleconsulta realizada por plataforma digital del sistema de salud.", "Se entrega resumen de consulta escrito al paciente para su referencia.", "Carta de referencia enviada a especialista con historial completo.", "Informe médico legal emitido según solicitud del paciente.", "Certificado de discapacidad tramitado según normativa vigente.", "Incapacidad laboral otorgada por 5 días hábiles.", "Alta médica definitiva. Paciente estable sin necesidad de seguimiento.", "Control programado en 1 mes con exámenes de laboratorio incluidos.", "Próxima cita en 3 meses salvo aparición de nuevos síntomas.", "Paciente dado de alta con instrucciones claras de cuándo consultar.", "Sin indicación de nueva cita por el momento. Consulta si es necesario.", "Derivación a medicina física y rehabilitación por deterioro funcional.", "Interconsulta a cardiología por hallazgo de soplo nuevo en auscultación.", "Valoración por psiquiatría solicitada por deterioro de salud mental.", "Referencia a oftalmología por retinopatía detectada en fondo de ojo.", "Valoración urgente por nefrología por deterioro agudo de función renal.", "Se documenta discusión del caso en sesión clínica del servicio.", "Caso presentado en comité de tumores. Decisión de tratamiento acordada.", "Notificación obligatoria a epidemiología por enfermedad de declaración.", "Se reporta caso a sistema de farmacovigilancia institucional.", "Revisión de medicamentos realizada con farmacéutico clínico presente.", "Plan de cuidados actualizado con equipo de enfermería.", "Comunicación con médico tratante de atención primaria.", "Consulta con medicina interna para manejo de patología compleja.", "Paciente dado de alta con epícrisis completa y plan de seguimiento.", "Se realizó procedimiento exitosamente sin complicaciones inmediatas.", "Consentimiento informado firmado antes del procedimiento.", "Paciente agradece atención. Refiere sentirse bien informado y apoyado.", "Documentación clínica completa y actualizada en expediente electrónico.", "Se adjunta copia de estudios de imagen al expediente del paciente.", "Resumen de hospitalización revisado y concordante con evolución clínica."];


// ── Catálogos para citas, documentos y expedientes ──

// Son exactamente los 4 tipos que ofrece el selector de la pantalla de Citas.
// Se repiten algunos para que Seguimiento y Control sean más frecuentes.
const TIPOS_CONSULTA_CITA = ["Seguimiento", "Seguimiento", "Control", "Control", "Primera cita", "Emergencia"];

const MONTOS_CITA = [15000, 25000, 30000, 35000, 50000, 75000, 100000];

const NOTAS_CITA = [
  "",
  "Paciente solicita revisión de exámenes de laboratorio.",
  "Confirmar asistencia por teléfono un día antes.",
  "Traer el carné de vacunación.",
  "Control posterior al ajuste de medicamentos.",
  "Primera valoración del paciente.",
  "Seguimiento de la evolución del tratamiento.",
  "Paciente refiere mejoría desde la última visita.",
  "Ayuno de 8 horas para toma de muestras.",
];

const NOMBRES_DOCUMENTOS = [
  "Resultados de laboratorio",
  "Radiografía de tórax",
  "Electrocardiograma",
  "Informe de ultrasonido",
  "Receta médica",
  "Consentimiento informado",
  "Referencia a especialista",
  "Epicrisis de hospitalización",
];

// PDF público de ejemplo del W3C (existe y responde). Su tamaño real es 13 264 bytes.
const URL_DOCUMENTO_EJEMPLO = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const TAMAÑO_DOCUMENTO_EJEMPLO = 13264;

const DOSIS_MEDICAMENTO = ["1 tableta", "2 tabletas", "1 cápsula", "5 ml", "10 ml"];
const FRECUENCIAS_MEDICAMENTO = ["Cada 6 horas", "Cada 8 horas", "Cada 12 horas", "Una vez al día"];
const DURACIONES_MEDICAMENTO = ["5 días", "7 días", "10 días", "30 días", "Uso continuo"];

// ── Catálogo de formularios clínicos ──
// Cada campo usa uno de los 9 tipos que ofrece el constructor de formularios:
// text, textarea, number, date, select, multiselect, checkbox, diagnostico, medicamento.
// "ejemplos", "rango" y "decimales" solo sirven para generar respuestas de ejemplo;
// no se guardan dentro del formulario.
const CATALOGO_FORMULARIOS = [
  {
    nombre: "Historia clínica general",
    especialidad: "Medicina general",
    descripcion: "Registro de antecedentes, hábitos y motivo de consulta del paciente.",
    campos: [
      { tipo: "textarea", etiqueta: "Motivo de consulta", placeholder: "Describa el motivo principal", requerido: true, ejemplos: MOTIVOS_CONSULTA },
      { tipo: "textarea", etiqueta: "Antecedentes personales", placeholder: "Enfermedades previas y cirugías", ejemplos: ["Hipertensión controlada desde hace 5 años", "Sin antecedentes patológicos relevantes", "Apendicectomía en 2015", "Asma en la infancia", "Diabetes tipo 2 en tratamiento"] },
      { tipo: "text", etiqueta: "Alergias conocidas", placeholder: "Medicamentos o alimentos", ejemplos: ["Ninguna conocida", "Penicilina", "Mariscos", "Polen", "Ibuprofeno"] },
      { tipo: "checkbox", etiqueta: "Fuma actualmente", placeholder: "El paciente fuma" },
      { tipo: "select", etiqueta: "Nivel de actividad física", requerido: true, opciones: ["Sedentario", "Ligero", "Moderado", "Intenso"] },
      { tipo: "date", etiqueta: "Fecha de la última consulta médica" },
      { tipo: "textarea", etiqueta: "Observaciones generales", placeholder: "Notas adicionales", ejemplos: NOTAS_CLINICAS },
    ],
  },
  {
    nombre: "Control pediátrico",
    especialidad: "Pediatría",
    descripcion: "Seguimiento del crecimiento y desarrollo en consulta pediátrica.",
    campos: [
      { tipo: "number", etiqueta: "Peso (kg)", placeholder: "Peso en kilogramos", requerido: true, rango: [3, 30], decimales: 1 },
      { tipo: "number", etiqueta: "Talla (cm)", placeholder: "Talla en centímetros", requerido: true, rango: [50, 130], decimales: 0 },
      { tipo: "number", etiqueta: "Perímetro cefálico (cm)", placeholder: "Perímetro en centímetros", rango: [33, 55], decimales: 1 },
      { tipo: "checkbox", etiqueta: "Esquema de vacunación al día", placeholder: "Vacunas completas para la edad" },
      { tipo: "select", etiqueta: "Tipo de alimentación", requerido: true, opciones: ["Lactancia materna", "Fórmula", "Mixta", "Alimentación complementaria"] },
      { tipo: "textarea", etiqueta: "Desarrollo psicomotor", placeholder: "Hitos alcanzados", ejemplos: ["Sostiene la cabeza, sonríe y sigue objetos con la mirada.", "Camina solo y dice palabras sencillas.", "Desarrollo acorde a la edad, sin alteraciones.", "Gatea y balbucea con normalidad."] },
      { tipo: "date", etiqueta: "Fecha del próximo control" },
    ],
  },
  {
    nombre: "Valoración cardiovascular",
    especialidad: "Cardiología",
    descripcion: "Evaluación de signos y síntomas cardiovasculares.",
    campos: [
      { tipo: "text", etiqueta: "Presión arterial", placeholder: "Ejemplo: 120/80", requerido: true, ejemplos: ["110/70", "120/80", "130/85", "140/90", "150/95"] },
      { tipo: "number", etiqueta: "Frecuencia cardíaca (lpm)", placeholder: "Latidos por minuto", requerido: true, rango: [55, 110], decimales: 0 },
      { tipo: "multiselect", etiqueta: "Síntomas presentes", opciones: ["Dolor torácico", "Palpitaciones", "Falta de aire", "Mareos", "Hinchazón de piernas"] },
      { tipo: "diagnostico", etiqueta: "Diagnóstico presuntivo", placeholder: "Diagnóstico" },
      { tipo: "medicamento", etiqueta: "Medicamento indicado", placeholder: "Medicamento y dosis" },
      { tipo: "textarea", etiqueta: "Observaciones", placeholder: "Notas del especialista", ejemplos: NOTAS_CLINICAS },
    ],
  },
  {
    nombre: "Control de diabetes",
    especialidad: "Endocrinología",
    descripcion: "Seguimiento metabólico del paciente con diabetes.",
    campos: [
      { tipo: "number", etiqueta: "Glucemia en ayunas (mg/dL)", placeholder: "Valor en mg/dL", requerido: true, rango: [80, 240], decimales: 0 },
      { tipo: "number", etiqueta: "Hemoglobina glicosilada (%)", placeholder: "Porcentaje", rango: [5, 11], decimales: 1 },
      { tipo: "select", etiqueta: "Tipo de diabetes", requerido: true, opciones: ["Tipo 1", "Tipo 2", "Gestacional"] },
      { tipo: "select", etiqueta: "Adherencia al tratamiento", opciones: ["Buena", "Regular", "Deficiente"] },
      { tipo: "multiselect", etiqueta: "Complicaciones", opciones: ["Neuropatía", "Retinopatía", "Nefropatía", "Pie diabético", "Ninguna"] },
      { tipo: "medicamento", etiqueta: "Medicamento de control", placeholder: "Medicamento y dosis" },
      { tipo: "textarea", etiqueta: "Plan de seguimiento", placeholder: "Indicaciones de control", ejemplos: ["Control en 3 meses con hemoglobina glicosilada.", "Reforzar plan de alimentación y actividad física.", "Ajuste de dosis y control de glucemia en 2 semanas.", "Referir a nutrición para plan alimentario."] },
    ],
  },
  {
    nombre: "Valoración dermatológica",
    especialidad: "Dermatología",
    descripcion: "Descripción de lesiones de la piel y tratamiento indicado.",
    campos: [
      { tipo: "text", etiqueta: "Zona afectada", placeholder: "Ejemplo: antebrazo derecho", requerido: true, ejemplos: ["Antebrazo derecho", "Espalda", "Cuero cabelludo", "Rostro", "Pies", "Manos"] },
      { tipo: "select", etiqueta: "Tiempo de evolución", requerido: true, opciones: ["Menos de 1 semana", "1 a 4 semanas", "1 a 6 meses", "Más de 6 meses"] },
      { tipo: "multiselect", etiqueta: "Tipo de lesión", opciones: ["Mancha", "Pápula", "Placa", "Vesícula", "Costra", "Descamación"] },
      { tipo: "checkbox", etiqueta: "Presenta picazón", placeholder: "El paciente refiere picazón" },
      { tipo: "diagnostico", etiqueta: "Diagnóstico", placeholder: "Diagnóstico dermatológico" },
      { tipo: "medicamento", etiqueta: "Tratamiento tópico", placeholder: "Medicamento y modo de uso" },
    ],
  },
  {
    nombre: "Evaluación nutricional",
    especialidad: "Nutrición",
    descripcion: "Valoración antropométrica y hábitos de alimentación.",
    campos: [
      { tipo: "number", etiqueta: "Peso (kg)", placeholder: "Peso en kilogramos", requerido: true, rango: [45, 120], decimales: 1 },
      { tipo: "number", etiqueta: "Talla (cm)", placeholder: "Talla en centímetros", requerido: true, rango: [145, 195], decimales: 0 },
      { tipo: "number", etiqueta: "Circunferencia abdominal (cm)", placeholder: "Medida en centímetros", rango: [65, 120], decimales: 0 },
      { tipo: "number", etiqueta: "Comidas al día", placeholder: "Cantidad de comidas", rango: [2, 6], decimales: 0 },
      { tipo: "select", etiqueta: "Consumo de agua diario", opciones: ["Menos de 1 litro", "1 a 2 litros", "Más de 2 litros"] },
      { tipo: "textarea", etiqueta: "Restricciones alimentarias", placeholder: "Alergias o intolerancias", ejemplos: ["Ninguna.", "Intolerancia a la lactosa.", "No consume carnes rojas.", "Evita gluten por indicación médica."] },
      { tipo: "text", etiqueta: "Meta nutricional", placeholder: "Objetivo acordado", ejemplos: ["Reducir 5 kg en 3 meses", "Mantener peso actual", "Aumentar consumo de fibra", "Mejorar control de la glucosa"] },
    ],
  },
  {
    nombre: "Control prenatal",
    especialidad: "Ginecología y obstetricia",
    descripcion: "Seguimiento del embarazo en cada control prenatal.",
    campos: [
      { tipo: "number", etiqueta: "Semanas de gestación", placeholder: "Semanas cumplidas", requerido: true, rango: [6, 40], decimales: 0 },
      { tipo: "date", etiqueta: "Fecha probable de parto", requerido: true },
      { tipo: "number", etiqueta: "Altura uterina (cm)", placeholder: "Medida en centímetros", rango: [10, 38], decimales: 0 },
      { tipo: "number", etiqueta: "Frecuencia cardíaca fetal (lpm)", placeholder: "Latidos por minuto", rango: [120, 160], decimales: 0 },
      { tipo: "checkbox", etiqueta: "Movimientos fetales presentes", placeholder: "La paciente percibe movimientos" },
      { tipo: "textarea", etiqueta: "Observaciones del control", placeholder: "Notas del control", ejemplos: ["Embarazo de curso normal, sin signos de alarma.", "Se indican vitaminas prenatales y control en 4 semanas.", "Paciente asintomática, se solicita ultrasonido de seguimiento.", "Se educa sobre signos de alarma en el embarazo."] },
    ],
  },
  {
    nombre: "Seguimiento de salud mental",
    especialidad: "Psiquiatría",
    descripcion: "Evolución del estado emocional y del tratamiento.",
    campos: [
      { tipo: "select", etiqueta: "Estado de ánimo", requerido: true, opciones: ["Estable", "Decaído", "Ansioso", "Irritable"] },
      { tipo: "select", etiqueta: "Calidad del sueño", requerido: true, opciones: ["Buena", "Regular", "Mala", "Insomnio"] },
      { tipo: "checkbox", etiqueta: "Ideas de autolesión", placeholder: "El paciente refiere ideas de autolesión" },
      { tipo: "multiselect", etiqueta: "Síntomas actuales", opciones: ["Ansiedad", "Tristeza", "Fatiga", "Falta de concentración", "Irritabilidad"] },
      { tipo: "medicamento", etiqueta: "Medicamento indicado", placeholder: "Medicamento y dosis" },
      { tipo: "textarea", etiqueta: "Notas de la sesión", placeholder: "Resumen de la sesión", ejemplos: ["Paciente colaborador, refiere mejoría del ánimo.", "Se refuerzan técnicas de relajación y manejo del estrés.", "Se mantiene el tratamiento actual y se cita en 4 semanas.", "Se trabaja en la identificación de pensamientos negativos."] },
    ],
  },
];

// ── Funciones auxiliares ──

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

function numeroEnRango(min, max, decimales) {
  return Number((min + Math.random() * (max - min)).toFixed(decimales));
}

function fechaAleatoria(añoMin, añoMax) {
  const año = numeroAleatorio(añoMin, añoMax);
  const mes = numeroAleatorio(1, 12);
  const dia = numeroAleatorio(1, 28);
  return Timestamp.fromDate(new Date(`${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`));
}

// Fecha local a medianoche, desplazada N días respecto de hoy (negativo = pasado).
// La aplicación guarda las fechas de las citas de la misma forma.
function fechaLocalConOffset(dias) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
}

function formatoFechaIso(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Fecha aleatoria entre el 1 de enero de añoMin y hoy (nunca en el futuro).
function fechaPasadaAleatoria(añoMin) {
  const diasDisponibles = Math.floor((Date.now() - new Date(añoMin, 0, 1).getTime()) / 86400000);
  return Timestamp.fromDate(fechaLocalConOffset(-numeroAleatorio(0, diasDisponibles)));
}

function sumarMinutos(horaTexto, minutos) {
  const [horas, mins] = horaTexto.split(":").map(Number);
  const total = horas * 60 + mins + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function generarCedula() {
  return String(numeroAleatorio(100000000, 999999999));
}

function generarTelefono() {
  return String(numeroAleatorio(60000000, 89999999));
}

// ── Escritura en Firestore ──
// Todo registro se crea por aquí para que siempre lleve _seed: true y unseed.js
// pueda eliminarlo.

const contadores = {};

function contar(coleccion) {
  contadores[coleccion] = (contadores[coleccion] || 0) + 1;
}

async function crear(coleccion, datos) {
  const ref = await addDoc(collection(db, coleccion), { ...datos, _seed: true });
  contar(coleccion);
  return ref;
}

// Igual que crear(), pero con un documento cuyo ID ya se conoce (las versiones
// de un formulario necesitan referenciarse entre sí).
async function crearConId(coleccion, ref, datos) {
  await setDoc(ref, { ...datos, _seed: true });
  contar(coleccion);
}

// ── Generadores: pacientes y consultas ──

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
    numero_expediente: `EXP-${numeroAleatorio(10000, 99999)}`,
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
  };
}

// "cita" es opcional: si se indica, la consulta queda vinculada a esa cita
// completada (mismo ID y misma fecha), como ocurre al atender una cita real.
function generarConsulta(pacienteId, diagnosticosBase, cita = null) {
  // 70% de probabilidad de usar un diagnóstico base del paciente
  const usarBase = diagnosticosBase.length > 0 && Math.random() < 0.7;
  const diagnostico = usarBase
    ? aleatorioN(diagnosticosBase, 1)
    : aleatorioN(DIAGNOSTICOS_OPCIONES, numeroAleatorio(1, 2));

  return {
    pacienteId,
    doctorId: DOCTOR_ID,
    citaId: cita ? cita.id : "",
    fecha: cita ? Timestamp.fromDate(cita.fechaCita) : fechaPasadaAleatoria(2024),
    fechaCreacion: Timestamp.now(),
    motivoConsulta: aleatorio(MOTIVOS_CONSULTA),
    examenFisico: aleatorio(EXAMENES_FISICOS),
    diagnostico,
    tratamiento: aleatorio(TRATAMIENTOS),
    indicaciones: aleatorio(INDICACIONES),
    notasClinicas: aleatorio(NOTAS_CLINICAS),
    resumenIA: "",
  };
}

// ── Generadores: citas ──

const HORAS_CITA = (() => {
  const horas = [];
  for (let minutos = 8 * 60; minutos < 17 * 60; minutos += 15) {
    horas.push(`${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`);
  }
  return horas;
})();

// La aplicación no permite dos citas activas en la misma fecha y hora de inicio,
// así que el seed tampoco las genera.
const horariosOcupados = new Set();

function reservarHorario() {
  for (let intento = 0; intento < 50; intento++) {
    const dias = numeroAleatorio(-DIAS_CITAS_PASADAS, DIAS_CITAS_FUTURAS);
    const fechaCita = fechaLocalConOffset(dias);
    const hora = aleatorio(HORAS_CITA);
    const clave = `${formatoFechaIso(fechaCita)}|${hora}`;
    if (!horariosOcupados.has(clave)) {
      horariosOcupados.add(clave);
      return { dias, fechaCita, hora };
    }
  }
  return null;
}

// Las citas pasadas casi siempre se completaron; las futuras están programadas o confirmadas.
function estadoCita(dias) {
  const azar = Math.random();
  if (dias < 0) return azar < 0.8 ? "completada" : "cancelada";
  if (azar < 0.55) return "programada";
  return azar < 0.9 ? "confirmada" : "cancelada";
}

function generarCita(paciente, pacienteId) {
  const horario = reservarHorario();
  if (!horario) return null;
  const estado = estadoCita(horario.dias);

  return {
    estado,
    fechaCita: horario.fechaCita,
    datos: {
      pacienteId,
      paciente_nombre: `${paciente.nombre} ${paciente.apellidos}`,
      paciente_correo: paciente.email,
      tipo_consulta: aleatorio(TIPOS_CONSULTA_CITA),
      fecha: Timestamp.fromDate(horario.fechaCita),
      hora_inicio: horario.hora,
      hora_fin: sumarMinutos(horario.hora, aleatorio([30, 45])),
      estado,
      monto: aleatorio(MONTOS_CITA),
      notas: aleatorio(NOTAS_CITA),
      medico_id: DOCTOR_ID,
      creado_en: Timestamp.now(),
      actualizado_en: Timestamp.now(),
    },
  };
}

// ── Generadores: formularios ──

function crearCampo(definicion, orden) {
  return {
    id: randomUUID(),
    tipo: definicion.tipo,
    etiqueta: definicion.etiqueta,
    placeholder: definicion.placeholder || "",
    requerido: Boolean(definicion.requerido),
    opciones: definicion.opciones || [],
    orden,
  };
}

// Valor de ejemplo con el mismo tipo que guarda la pantalla para ese campo.
function valorParaCampo(campo, definicion) {
  switch (campo.tipo) {
    case "number":
      return definicion.rango
        ? numeroEnRango(definicion.rango[0], definicion.rango[1], definicion.decimales || 0)
        : numeroAleatorio(1, 100);
    case "date":
      return formatoFechaIso(fechaLocalConOffset(numeroAleatorio(-60, 90)));
    case "select":
      return aleatorio(campo.opciones);
    case "multiselect":
      return aleatorioN(campo.opciones, numeroAleatorio(1, Math.min(2, campo.opciones.length)));
    case "checkbox":
      return Math.random() < 0.5;
    case "diagnostico":
      return aleatorio(DIAGNOSTICOS_OPCIONES);
    case "medicamento":
      return aleatorio(MEDICAMENTOS_OPCIONES);
    default:
      return definicion.ejemplos ? aleatorio(definicion.ejemplos) : aleatorio(NOTAS_CLINICAS);
  }
}

// Una respuesta completa llena todos los campos; un borrador llena los
// obligatorios y solo algunos de los opcionales.
function generarRespuestas(campos, definiciones, completa) {
  const respuestas = {};
  campos.forEach((campo, i) => {
    if (!completa && !campo.requerido && Math.random() < 0.5) return;
    respuestas[campo.id] = valorParaCampo(campo, definiciones[i]);
  });
  return respuestas;
}

// Crea los formularios del catálogo. Los últimos quedan archivados, los
// anteriores a esos quedan como plantilla y el resto como formularios activos.
// Devuelve la versión vigente de cada uno; "utilizable" indica si se puede
// responder o asignar a una cita (activo y no plantilla).
async function crearFormularios() {
  const cantidad = Math.min(CANTIDAD_FORMULARIOS, CATALOGO_FORMULARIOS.length);
  const elegidos = aleatorioN(CATALOGO_FORMULARIOS, cantidad);
  const formularios = [];

  for (let indice = 0; indice < elegidos.length; indice++) {
    const modelo = elegidos[indice];
    const archivado = indice >= cantidad - FORMULARIOS_ARCHIVADOS;
    const plantilla = !archivado && indice >= cantidad - FORMULARIOS_ARCHIVADOS - FORMULARIOS_COMO_PLANTILLA;
    const estadoFormulario = plantilla ? "plantilla" : "activo";

    // Todas las versiones comparten un baseFormularioId (el ID de la primera);
    // cada versión nueva agrega campos a la anterior.
    const refs = Array.from({ length: VERSIONES_POR_FORMULARIO }, () => doc(collection(db, "formularios_clinicos")));
    let vigente = null;

    for (let version = 1; version <= VERSIONES_POR_FORMULARIO; version++) {
      const definiciones = modelo.campos.slice(0, Math.max(3, modelo.campos.length - (VERSIONES_POR_FORMULARIO - version)));
      const campos = definiciones.map((definicion, i) => crearCampo(definicion, i + 1));
      const diasAtras = (VERSIONES_POR_FORMULARIO - version) * numeroAleatorio(20, 40) + numeroAleatorio(1, 10);
      const fecha = Timestamp.fromDate(fechaLocalConOffset(-diasAtras));

      const datos = {
        nombre: modelo.nombre,
        descripcion: modelo.descripcion,
        especialidad: modelo.especialidad,
        campos,
        version,
        activo: !archivado,
        estadoFormulario,
        creado_por: DOCTOR_ID,
        creado_en: fecha,
        modificado_en: fecha,
      };

      if (VERSIONES_POR_FORMULARIO > 1) {
        datos.baseFormularioId = refs[0].id;
        datos.isCurrentVersion = version === VERSIONES_POR_FORMULARIO;
        if (version > 1) datos.previousVersionId = refs[version - 2].id;
      }

      await crearConId("formularios_clinicos", refs[version - 1], datos);
      vigente = { id: refs[version - 1].id, campos, definiciones };
    }

    formularios.push({
      id: vigente.id,
      nombre: modelo.nombre,
      especialidad: modelo.especialidad,
      version: VERSIONES_POR_FORMULARIO,
      campos: vigente.campos,
      definiciones: vigente.definiciones,
      utilizable: !archivado && !plantilla,
    });
  }

  return formularios;
}

// Asigna un formulario a una cita (colección formularios_citas).
async function asignarFormularioACita(cita, pacienteId, formularios) {
  const formulario = aleatorio(formularios);
  let estado = "assigned";
  if (cita.estado === "completada") estado = Math.random() < 0.7 ? "completed" : "draft";
  else if (cita.estado !== "cancelada" && Math.random() < 0.2) estado = "draft";

  await crear("formularios_citas", {
    citaId: cita.id,
    formularioId: formulario.id,
    formularioNombre: formulario.nombre,
    formularioEspecialidad: formulario.especialidad,
    formularioVersion: formulario.version,
    pacienteId,
    doctorId: DOCTOR_ID,
    estado,
    respuestas: estado === "assigned" ? {} : generarRespuestas(formulario.campos, formulario.definiciones, estado === "completed"),
    creado_en: Timestamp.now(),
    modificado_en: Timestamp.now(),
  });
}

// Respuestas de formularios clínicos de un paciente (colección formularios_paciente).
// Cada paciente responde formularios distintos entre sí.
async function crearRespuestasPaciente(pacienteId, formularios) {
  const elegidos = aleatorioN(formularios, Math.min(FORMULARIOS_RESPONDIDOS_POR_PACIENTE, formularios.length));

  for (const formulario of elegidos) {
    const estado = Math.random() < 0.75 ? "completed" : "draft";
    const fecha = Timestamp.fromDate(fechaLocalConOffset(-numeroAleatorio(1, 150)));
    await crear("formularios_paciente", {
      pacienteId,
      formularioId: formulario.id,
      formularioNombre: formulario.nombre,
      formularioEspecialidad: formulario.especialidad,
      formularioVersion: formulario.version,
      doctorId: DOCTOR_ID,
      estado,
      respuestas: generarRespuestas(formulario.campos, formulario.definiciones, estado === "completed"),
      creado_en: fecha,
      modificado_en: fecha,
    });
  }

  return elegidos.length;
}

// ── Generadores: documentos y expedientes ──

function generarDocumento(pacienteId) {
  return {
    pacienteId,
    doctorId: DOCTOR_ID,
    nombre: `${aleatorio(NOMBRES_DOCUMENTOS)}.pdf`,
    tipo: "pdf",
    url: URL_DOCUMENTO_EJEMPLO,
    tamaño: TAMAÑO_DOCUMENTO_EJEMPLO,
    creado_en: Timestamp.fromDate(fechaLocalConOffset(-numeroAleatorio(1, 200))),
  };
}

function generarSignosVitales() {
  const peso = numeroAleatorio(45, 110);
  const talla = numeroAleatorio(150, 190);
  return {
    presion_arterial: `${numeroAleatorio(100, 150)}/${numeroAleatorio(60, 95)}`,
    frecuencia_cardiaca: numeroAleatorio(55, 100),
    temperatura: numeroEnRango(36, 37.5, 1),
    peso,
    talla,
    imc: Number((peso / ((talla / 100) ** 2)).toFixed(1)),
    saturacion_oxigeno: numeroAleatorio(94, 100),
    frecuencia_respiratoria: numeroAleatorio(12, 22),
  };
}

// "cita" es opcional: si se indica, el expediente toma su fecha y su ID.
function generarExpediente(pacienteId, diagnosticosBase, cita = null) {
  const principal = diagnosticosBase.length > 0 && Math.random() < 0.7
    ? aleatorio(diagnosticosBase)
    : aleatorio(DIAGNOSTICOS_OPCIONES);
  const fecha = cita ? Timestamp.fromDate(cita.fechaCita) : fechaPasadaAleatoria(2024);

  return {
    paciente_id: pacienteId,
    medico_id: DOCTOR_ID,
    cita_id: cita ? cita.id : "",
    fecha_consulta: fecha,
    motivo_consulta: aleatorio(MOTIVOS_CONSULTA),
    signos_vitales: generarSignosVitales(),
    anamnesis: aleatorio(NOTAS_CLINICAS),
    exploracion_fisica: aleatorio(EXAMENES_FISICOS),
    diagnostico_principal: principal,
    diagnosticos_secundarios: aleatorioN(DIAGNOSTICOS_OPCIONES.filter((d) => d !== principal), numeroAleatorio(0, 1)),
    plan_tratamiento: aleatorio(TRATAMIENTOS),
    medicamentos_recetados: aleatorioN(MEDICAMENTOS_OPCIONES, numeroAleatorio(0, 2)).map((nombre) => ({
      nombre,
      dosis: aleatorio(DOSIS_MEDICAMENTO),
      frecuencia: aleatorio(FRECUENCIAS_MEDICAMENTO),
      duracion: aleatorio(DURACIONES_MEDICAMENTO),
    })),
    indicaciones_paciente: aleatorio(INDICACIONES),
    observaciones: aleatorio(NOTAS_CLINICAS),
    resumen_ia: "",
    creado_en: fecha,
    actualizado_en: fecha,
  };
}

// ── Validación de la configuración ──

function validarConfiguracion() {
  const enteros = {
    CANTIDAD_PACIENTES,
    CONSULTAS_POR_PACIENTE,
    EXPEDIENTES_POR_PACIENTE,
    DOCUMENTOS_POR_PACIENTE,
    CITAS_POR_PACIENTE,
    DIAS_CITAS_PASADAS,
    DIAS_CITAS_FUTURAS,
    CANTIDAD_FORMULARIOS,
    FORMULARIOS_COMO_PLANTILLA,
    FORMULARIOS_ARCHIVADOS,
    FORMULARIOS_RESPONDIDOS_POR_PACIENTE,
  };
  for (const [nombre, valor] of Object.entries(enteros)) {
    if (!Number.isInteger(valor) || valor < 0) {
      throw new Error(`${nombre} debe ser un número entero mayor o igual a 0 (valor actual: ${valor}).`);
    }
  }
  if (!Number.isInteger(VERSIONES_POR_FORMULARIO) || VERSIONES_POR_FORMULARIO < 1) {
    throw new Error(`VERSIONES_POR_FORMULARIO debe ser un número entero mayor o igual a 1 (valor actual: ${VERSIONES_POR_FORMULARIO}).`);
  }
  if (!Number.isFinite(PORCENTAJE_CITAS_CON_FORMULARIO) || PORCENTAJE_CITAS_CON_FORMULARIO < 0 || PORCENTAJE_CITAS_CON_FORMULARIO > 100) {
    throw new Error(`PORCENTAJE_CITAS_CON_FORMULARIO debe estar entre 0 y 100 (valor actual: ${PORCENTAJE_CITAS_CON_FORMULARIO}).`);
  }
  if (FORMULARIOS_COMO_PLANTILLA + FORMULARIOS_ARCHIVADOS > Math.min(CANTIDAD_FORMULARIOS, CATALOGO_FORMULARIOS.length)) {
    throw new Error("FORMULARIOS_COMO_PLANTILLA + FORMULARIOS_ARCHIVADOS no pueden superar la cantidad de formularios que se van a crear.");
  }
  if (!DOCTOR_ID) {
    throw new Error("No se pudo determinar el UID del médico: la sesión no se inició correctamente.");
  }
  if (CANTIDAD_FORMULARIOS > CATALOGO_FORMULARIOS.length) {
    console.log(`Aviso: el catálogo tiene ${CATALOGO_FORMULARIOS.length} formularios; se crearán solo esos.\n`);
  }
}

async function seed() {
  await iniciarSesion();
  validarConfiguracion();

  console.log(`Médico (DOCTOR_ID): ${DOCTOR_ID}`);
  console.log(`Creando ${CANTIDAD_PACIENTES} pacientes: ${CITAS_POR_PACIENTE} citas, ${CONSULTAS_POR_PACIENTE} consultas, ${EXPEDIENTES_POR_PACIENTE} expedientes y ${DOCUMENTOS_POR_PACIENTE} documentos cada uno...\n`);

  // Los formularios se crean primero porque las citas y los pacientes los referencian.
  const formularios = await crearFormularios();
  const formulariosUtilizables = formularios.filter((f) => f.utilizable);
  if (formularios.length > 0) {
    console.log(`✓ ${formularios.length} formularios creados (${formulariosUtilizables.length} activos, ${FORMULARIOS_COMO_PLANTILLA} plantilla, ${FORMULARIOS_ARCHIVADOS} archivados)\n`);
  }

  let citasOmitidas = 0;

  for (let i = 0; i < CANTIDAD_PACIENTES; i++) {
    const pacienteData = generarPaciente(i);
    const pacienteRef = await crear("pacientes", pacienteData);
    console.log(`✓ Paciente ${i + 1}/${CANTIDAD_PACIENTES}: ${pacienteData.nombre} ${pacienteData.apellidos}`);

    // Cada paciente tiene 1-3 condiciones crónicas que se repiten en sus consultas
    const diagnosticosBase = aleatorioN(DIAGNOSTICOS_OPCIONES, numeroAleatorio(1, 3));

    // Citas
    const citas = [];
    for (let j = 0; j < CITAS_POR_PACIENTE; j++) {
      const cita = generarCita(pacienteData, pacienteRef.id);
      if (cita) citas.push(cita);
      else citasOmitidas++;
    }
    await Promise.all(citas.map(async (cita) => {
      const ref = await crear("citas", cita.datos);
      cita.id = ref.id;
    }));

    // Formularios asignados a algunas de esas citas
    if (formulariosUtilizables.length > 0) {
      for (const cita of citas) {
        if (Math.random() * 100 < PORCENTAJE_CITAS_CON_FORMULARIO) {
          await asignarFormularioACita(cita, pacienteRef.id, formulariosUtilizables);
        }
      }
    }

    // Las consultas y los expedientes se vinculan primero a las citas completadas
    // (de la más reciente a la más antigua); el resto lleva una fecha pasada al azar.
    const completadas = citas
      .filter((cita) => cita.estado === "completada")
      .sort((a, b) => b.fechaCita - a.fechaCita);

    await Promise.all(
      Array.from({ length: CONSULTAS_POR_PACIENTE }, (_, j) =>
        crear("consultas", generarConsulta(pacienteRef.id, diagnosticosBase, completadas[j] || null))
      )
    );

    await Promise.all(
      Array.from({ length: EXPEDIENTES_POR_PACIENTE }, (_, j) =>
        crear("expedientes", generarExpediente(pacienteRef.id, diagnosticosBase, completadas[j] || null))
      )
    );

    // Respuestas de formularios y documentos adjuntos
    const respondidos = formulariosUtilizables.length > 0
      ? await crearRespuestasPaciente(pacienteRef.id, formulariosUtilizables)
      : 0;

    await Promise.all(
      Array.from({ length: DOCUMENTOS_POR_PACIENTE }, () => crear("documentos", generarDocumento(pacienteRef.id)))
    );

    console.log(`  ✓ ${citas.length} citas · ${CONSULTAS_POR_PACIENTE} consultas · ${EXPEDIENTES_POR_PACIENTE} expedientes · ${respondidos} formularios respondidos · ${DOCUMENTOS_POR_PACIENTE} documentos`);
  }

  console.log("\n✅ Seed completado:");
  for (const [coleccion, total] of Object.entries(contadores)) {
    console.log(`   ${coleccion}: ${total}`);
  }
  if (citasOmitidas > 0) {
    console.log(`\nAviso: ${citasOmitidas} citas no se crearon porque no hubo horarios libres en el rango de fechas. Ampliá DIAS_CITAS_PASADAS o DIAS_CITAS_FUTURAS.`);
  }
  process.exit(0);
}

seed().catch((err) => { console.error("Error en seed:", err); process.exit(1); });
