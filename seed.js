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

const DOCTOR_ID = "9qYah3CPYOfotk8zhiMqGYgnm112";

// ── Cambiá estos números según lo que necesitás ──
const CANTIDAD_PACIENTES = 20;  // cuántos pacientes querés
const CONSULTAS_POR_PACIENTE = 5;  // cuántas consultas por paciente

// ── Datos aleatorios ── 
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

function generarConsulta(pacienteId, diagnosticosBase) {
  // 70% de probabilidad de usar un diagnóstico base del paciente
  const usarBase = diagnosticosBase.length > 0 && Math.random() < 0.7;
  const diagnostico = usarBase
    ? aleatorioN(diagnosticosBase, 1)
    : aleatorioN(DIAGNOSTICOS_OPCIONES, numeroAleatorio(1, 2));

  return {
    pacienteId,
    doctorId: DOCTOR_ID,
    citaId: "",
    fecha: fechaAleatoria(2024, 2026),
    fechaCreacion: Timestamp.now(),
    motivoConsulta: aleatorio(MOTIVOS_CONSULTA),
    examenFisico: aleatorio(EXAMENES_FISICOS),
    diagnostico,
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

    // Cada paciente tiene 1-3 condiciones crónicas que se repiten en sus consultas
    const diagnosticosBase = aleatorioN(DIAGNOSTICOS_OPCIONES, numeroAleatorio(1, 3));

    for (let j = 0; j < CONSULTAS_POR_PACIENTE; j++) {
      await addDoc(collection(db, "consultas"), generarConsulta(pacienteRef.id, diagnosticosBase));
    }
    console.log(`  ✓ ${CONSULTAS_POR_PACIENTE} consultas creadas`);
  }

  console.log(`\n✅ Seed completado: ${CANTIDAD_PACIENTES} pacientes, ${CANTIDAD_PACIENTES * CONSULTAS_POR_PACIENTE} consultas`);
  process.exit(0);
}

seed().catch((err) => { console.error("Error en seed:", err); process.exit(1); });