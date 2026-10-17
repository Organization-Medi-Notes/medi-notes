/**
 * Pruebas de las reglas de seguridad de Firestore (firestore.rules).
 *
 * Replica las consultas reales de la aplicación (flujos legítimos que deben ser aceptados) y
 * una lista de ataques que deben ser rechazados: acceso sin sesión, leer o escribir datos de
 * otro médico, listar usuarios sin ser administrador, asignarse el rol de administrador, etc.
 *
 * REQUISITOS (no forman parte de las dependencias del proyecto):
 *   - Java 11 o superior
 *   - npm install --no-save @firebase/rules-unit-testing firebase
 *   - Emulador de Firestore en 127.0.0.1:8080, por ejemplo con firebase-tools:
 *       firebase emulators:start --only firestore
 *     (si el sistema está en español y el emulador falla al armar mensajes de error, arrancar
 *     Java con -Duser.language=en -Duser.country=US)
 *
 * CÓMO CORRER:
 *   node tests/firestore-rules/firestore.rules.test.js
 */
// Pruebas de las reglas de Firestore contra el emulador (replica las consultas reales de la app)
const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const F = require('firebase/firestore');
const { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, setDoc, updateDoc, deleteDoc, Timestamp } = F;

const RULES = require('path').join(__dirname, '..', '..', 'firestore.rules');
let pass = 0, fail = 0;
async function t(nombre, promesa, esperado) {
  try {
    await (esperado === 'ok' ? assertSucceeds(promesa) : assertFails(promesa));
    pass++; console.log(`[OK   ] ${nombre}`);
  } catch (e) {
    fail++; console.log(`[FALLA] ${nombre} :: ${String(e.message || e).split('\n')[0].slice(0, 140)}`);
  }
}

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-medinotes', firestore: { rules: fs.readFileSync(RULES, 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const S = (p, d) => setDoc(doc(db, p), d);
    await S('usuarios/docA', { uid: 'docA', email: 'a@x.com', rol: 'doctor', activo: true });
    await S('usuarios/docB', { uid: 'docB', email: 'b@x.com', rol: 'doctor', activo: true });
    await S('usuarios/adm', { uid: 'adm', email: 'adm@x.com', rol: 'administrador', activo: true });
    await S('usuarios/asis', { uid: 'asis', email: 'asis@x.com', rol: 'asistente', activo: true });
    await S('pacientes/pA', { nombre: 'Ana', medico_id: 'docA', creado_en: Timestamp.now() });
    await S('pacientes/pA2', { nombre: 'Ana2', medico_id: 'docA', creado_en: Timestamp.now() });
    for (let i = 1; i <= 10; i++) await S(`pacientes/q${i}`, { nombre: `Q${i}`, medico_id: 'docA', creado_en: Timestamp.now() });
    await S('pacientes/pB', { nombre: 'Beto', medico_id: 'docB', creado_en: Timestamp.now() });
    await S('citas/cA', { medico_id: 'docA', pacienteId: 'pA', fecha: Timestamp.now() });
    await S('citas/cB', { medico_id: 'docB', pacienteId: 'pB', fecha: Timestamp.now() });
    await S('consultas/kA', { pacienteId: 'pA', doctorId: 'docA', fecha: Timestamp.now() });
    await S('consultas/kA2', { pacienteId: 'pA2', doctorId: '', fecha: Timestamp.now() }); // dato antiguo sin doctorId
    await S('consultas/kB', { pacienteId: 'pB', doctorId: 'docB', fecha: Timestamp.now() });
    await S('documentos/dA', { pacienteId: 'pA', doctorId: 'docA', creado_en: Timestamp.now() });
    await S('documentos/dB', { pacienteId: 'pB', doctorId: 'docB', creado_en: Timestamp.now() });
    await S('formularios_paciente/rA', { pacienteId: 'pA', formularioId: 'fA', doctorId: 'docA' });
    await S('formularios_paciente/rAlt', { patientId: 'pA', doctorId: 'docA' });
    await S('formularios_paciente/rLeg', { paciente_id: 'pA', doctorId: 'docA' });
    await S('formularios_paciente/rB', { pacienteId: 'pB', formularioId: 'fB', doctorId: 'docB' });
    await S('formularios_citas/aA', { citaId: 'cA', doctorId: 'docA' });
    await S('formularios_citas/aB', { citaId: 'cB', doctorId: 'docB' });
    await S('formularios_clinicos/fA', { creado_por: 'docA', nombre: 'F' });
    await S('formularios_clinicos/fB', { creado_por: 'docB', nombre: 'F' });
    await S('expedientes/eA', { medico_id: 'docA', paciente_id: 'pA' });
    await S('expedientes/eB', { medico_id: 'docB', paciente_id: 'pB' });
    await S('configuracion/docA', { nombre: 'A' });
    await S('configuracion/docB', { nombre: 'B' });
    await S('intentos_login/a@x.com', { intentosFallidos: 2, bloqueadoHasta: null });
    await S('auditorias/au1', { email: 'a@x.com', evento: 'LOGIN', estado: 'EXITOSO', detalle: 'x', fecha: new Date() });
  });

  const anon = env.unauthenticatedContext().firestore();
  const A = env.authenticatedContext('docA', { email: 'a@x.com' }).firestore();
  const B = env.authenticatedContext('docB', { email: 'b@x.com' }).firestore();
  const ADM = env.authenticatedContext('adm', { email: 'adm@x.com' }).firestore();
  const ASIS = env.authenticatedContext('asis', { email: 'asis@x.com' }).firestore();
  const C = (db, c) => collection(db, c);

  console.log('\n===== FLUJOS LEGÍTIMOS (la app debe seguir funcionando) =====');
  await t('doctor lee su propio usuario', getDoc(doc(A, 'usuarios/docA')), 'ok');
  await t('doctor actualiza ultimoAcceso/intentos de su usuario (login)', updateDoc(doc(A, 'usuarios/docA'), { ultimoAcceso: new Date(), intentosFallidos: 0, bloqueadoHasta: null }), 'ok');
  await t('doctor actualiza su teléfono', updateDoc(doc(A, 'usuarios/docA'), { telefono: '8888' }), 'ok');
  await t('registro: crear su usuario como doctor', setDoc(doc(env.authenticatedContext('nuevo', { email: 'n@x.com' }).firestore(), 'usuarios/nuevo'), { uid: 'nuevo', email: 'n@x.com', rol: 'doctor', activo: true, nombre: 'N' }), 'ok');
  await t('configuración propia: leer y guardar', Promise.all([getDoc(doc(A, 'configuracion/docA')), setDoc(doc(A, 'configuracion/docA'), { nombre: 'A2' }, { merge: true })]), 'ok');
  await t('pacientes del médico (medico_id + orderBy)', getDocs(query(C(A, 'pacientes'), where('medico_id', '==', 'docA'), orderBy('creado_en', 'desc'))), 'ok');
  await t('paciente por id propio', getDoc(doc(A, 'pacientes/pA')), 'ok');
  await t('crear paciente propio', addDoc(C(A, 'pacientes'), { nombre: 'X', medico_id: 'docA', activo: true }), 'ok');
  await t('archivar/etiquetar paciente propio', updateDoc(doc(A, 'pacientes/pA'), { activo: false, tags: ['x'] }), 'ok');
  await t('citas del médico (medico_id)', getDocs(query(C(A, 'citas'), where('medico_id', '==', 'docA'))), 'ok');
  await t('citas de un paciente (solo pacienteId)', getDocs(query(C(A, 'citas'), where('pacienteId', '==', 'pA'), orderBy('fecha', 'desc'))), 'ok');
  await t('cita por id propia', getDoc(doc(A, 'citas/cA')), 'ok');
  await t('crear cita propia', addDoc(C(A, 'citas'), { medico_id: 'docA', pacienteId: 'pA', estado: 'programada' }), 'ok');
  await t('actualizar cita propia', updateDoc(doc(A, 'citas/cA'), { estado: 'confirmada' }), 'ok');
  await t('eliminar cita propia', (async () => { const r = await addDoc(C(A, 'citas'), { medico_id: 'docA', pacienteId: 'pA' }); await deleteDoc(r); })(), 'ok');
  await t('consultas de un paciente (pacienteId + orderBy)', getDocs(query(C(A, 'consultas'), where('pacienteId', '==', 'pA'), orderBy('fecha', 'desc'))), 'ok');
  await t('consultas de paciente con dato antiguo sin doctorId', getDocs(query(C(A, 'consultas'), where('pacienteId', '==', 'pA2'))), 'ok');
  await t('consultas con "in" por lotes de pacientes propios', getDocs(query(C(A, 'consultas'), where('pacienteId', 'in', ['pA', 'pA2']))), 'ok');
  await t('consultas con "in" de 10 pacientes propios (lote de Reportes)', getDocs(query(C(A, 'consultas'), where('pacienteId', 'in', ['pA', 'pA2', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']))), 'ok');
  await t('crear consulta propia', addDoc(C(A, 'consultas'), { pacienteId: 'pA', doctorId: 'docA', fecha: Timestamp.now() }), 'ok');
  await t('documentos de un paciente', getDocs(query(C(A, 'documentos'), where('pacienteId', '==', 'pA'), orderBy('creado_en', 'desc'))), 'ok');
  await t('crear documento propio', addDoc(C(A, 'documentos'), { pacienteId: 'pA', doctorId: 'docA' }), 'ok');
  await t('formularios respondidos de un paciente', getDocs(query(C(A, 'formularios_paciente'), where('pacienteId', '==', 'pA'))), 'ok');
  await t('formularios respondidos (campo antiguo patientId) de paciente propio', getDocs(query(C(A, 'formularios_paciente'), where('patientId', '==', 'pA'))), 'ok');
  await t('formularios respondidos (campo antiguo paciente_id) de paciente propio', getDocs(query(C(A, 'formularios_paciente'), where('paciente_id', '==', 'pA'))), 'ok');
  await t('formularios respondidos por paciente y formulario', getDocs(query(C(A, 'formularios_paciente'), where('pacienteId', '==', 'pA'), where('formularioId', '==', 'fA'))), 'ok');
  await t('crear/actualizar/eliminar respuesta propia', (async () => { const r = await addDoc(C(A, 'formularios_paciente'), { pacienteId: 'pA', doctorId: 'docA' }); await updateDoc(r, { estado: 'completed' }); await deleteDoc(r); })(), 'ok');
  await t('formularios asignados a una cita propia', getDocs(query(C(A, 'formularios_citas'), where('citaId', '==', 'cA'))), 'ok');
  await t('asignar formulario a cita propia', addDoc(C(A, 'formularios_citas'), { citaId: 'cA', doctorId: 'docA' }), 'ok');
  await t('formularios clínicos del médico', getDocs(query(C(A, 'formularios_clinicos'), where('creado_por', '==', 'docA'))), 'ok');
  await t('formularios clínicos por base (versionado)', getDocs(query(C(A, 'formularios_clinicos'), where('creado_por', '==', 'docA'), where('baseFormularioId', '==', 'x'))), 'ok');
  await t('crear/editar/eliminar formulario clínico propio', (async () => { const r = await addDoc(C(A, 'formularios_clinicos'), { creado_por: 'docA', nombre: 'n' }); await updateDoc(r, { nombre: 'm' }); await deleteDoc(r); })(), 'ok');
  await t('expedientes del médico (Dashboard)', getDocs(query(C(A, 'expedientes'), where('medico_id', '==', 'docA'))), 'ok');
  await t('asistente ve sus propios datos', getDocs(query(C(ASIS, 'pacientes'), where('medico_id', '==', 'asis'))), 'ok');
  await t('login: leer contador de intentos sin sesión', getDoc(doc(anon, 'intentos_login/a@x.com')), 'ok');
  await t('login: primer intento fallido (crear con 1)', setDoc(doc(anon, 'intentos_login/nuevo@x.com'), { intentosFallidos: 1, bloqueadoHasta: null }), 'ok');
  await t('login: sumar un intento', updateDoc(doc(anon, 'intentos_login/a@x.com'), { intentosFallidos: 3, bloqueadoHasta: new Date(Date.now() + 5 * 60 * 1000) }), 'ok');
  await t('login: reiniciar contador al entrar (dueño autenticado)', updateDoc(doc(A, 'intentos_login/a@x.com'), { intentosFallidos: 0, bloqueadoHasta: null }), 'ok');
  await t('login: registrar auditoría sin sesión', addDoc(C(anon, 'auditorias'), { email: 'a@x.com', evento: 'LOGIN', estado: 'FALLIDO', detalle: 'x', fecha: new Date() }), 'ok');
  await t('administrador lista usuarios', getDocs(C(ADM, 'usuarios')), 'ok');
  await t('administrador cambia el rol de otro usuario', updateDoc(doc(ADM, 'usuarios/asis'), { rol: 'doctor' }), 'ok');
  await t('administrador lee auditorías', getDocs(C(ADM, 'auditorias')), 'ok');

  console.log('\n===== ATAQUES (todo esto debe ser RECHAZADO) =====');
  for (const c of ['usuarios', 'pacientes', 'citas', 'consultas', 'documentos', 'formularios_paciente', 'formularios_citas', 'formularios_clinicos', 'expedientes', 'configuracion', 'auditorias']) {
    await t(`sin sesión: LEER ${c}`, getDocs(C(anon, c)), 'fail');
  }
  for (const c of ['usuarios', 'pacientes', 'citas', 'consultas', 'documentos', 'expedientes']) {
    await t(`sin sesión: ESCRIBIR ${c}`, addDoc(C(anon, c), { medico_id: 'docA', pacienteId: 'pA', doctorId: 'docA', rol: 'administrador' }), 'fail');
  }
  await t('doctor: listar TODOS los usuarios', getDocs(C(B, 'usuarios')), 'fail');
  await t('doctor: leer el usuario de otra persona', getDoc(doc(B, 'usuarios/docA')), 'fail');
  await t('doctor: buscar usuarios por rol', getDocs(query(C(B, 'usuarios'), where('rol', '==', 'administrador'))), 'fail');
  await t('asistente: listar todos los usuarios', getDocs(C(ASIS, 'usuarios')), 'fail');
  await t('doctor: asignarse rol administrador (update)', updateDoc(doc(B, 'usuarios/docB'), { rol: 'administrador' }), 'fail');
  await t('doctor: reactivarse/cambiar activo', updateDoc(doc(B, 'usuarios/docB'), { activo: false }), 'fail');
  await t('doctor: cambiar el rol de otro usuario', updateDoc(doc(B, 'usuarios/docA'), { rol: 'asistente' }), 'fail');
  await t('registro: crear usuario con rol administrador', setDoc(doc(env.authenticatedContext('hack', { email: 'h@x.com' }).firestore(), 'usuarios/hack'), { uid: 'hack', email: 'h@x.com', rol: 'administrador', activo: true }), 'fail');
  await t('registro: crear usuario con el id de otra persona', setDoc(doc(B, 'usuarios/docA'), { uid: 'docA', email: 'a@x.com', rol: 'doctor', activo: true }), 'fail');
  await t('doctor: eliminar un usuario', deleteDoc(doc(B, 'usuarios/docA')), 'fail');
  await t('doctor: leer pacientes de otro (por id)', getDoc(doc(B, 'pacientes/pA')), 'fail');
  await t('doctor: listar pacientes sin filtro', getDocs(C(B, 'pacientes')), 'fail');
  await t('doctor: listar pacientes filtrando por otro médico', getDocs(query(C(B, 'pacientes'), where('medico_id', '==', 'docA'))), 'fail');
  await t('doctor: crear paciente a nombre de otro médico', addDoc(C(B, 'pacientes'), { nombre: 'X', medico_id: 'docA' }), 'fail');
  await t('doctor: modificar paciente de otro', updateDoc(doc(B, 'pacientes/pA'), { nombre: 'hack' }), 'fail');
  await t('doctor: quitarse/traspasar un paciente (cambiar medico_id)', updateDoc(doc(B, 'pacientes/pB'), { medico_id: 'docA' }), 'fail');
  await t('doctor: eliminar paciente de otro', deleteDoc(doc(B, 'pacientes/pA')), 'fail');
  await t('doctor: listar citas sin filtro', getDocs(C(B, 'citas')), 'fail');
  await t('doctor: citas de otro médico por medico_id', getDocs(query(C(B, 'citas'), where('medico_id', '==', 'docA'))), 'fail');
  await t('doctor: citas de un paciente ajeno', getDocs(query(C(B, 'citas'), where('pacienteId', '==', 'pA'))), 'fail');
  await t('doctor: crear cita a nombre de otro médico', addDoc(C(B, 'citas'), { medico_id: 'docA', pacienteId: 'pA' }), 'fail');
  await t('doctor: crear cita propia sobre paciente ajeno', addDoc(C(B, 'citas'), { medico_id: 'docB', pacienteId: 'pA' }), 'fail');
  await t('doctor: modificar cita ajena', updateDoc(doc(B, 'citas/cB'.replace('cB', 'cA')), { estado: 'cancelada' }), 'fail');
  await t('doctor: listar consultas sin filtro', getDocs(C(B, 'consultas')), 'fail');
  await t('doctor: consultas de un paciente ajeno', getDocs(query(C(B, 'consultas'), where('pacienteId', '==', 'pA'))), 'fail');
  await t('doctor: consultas con "in" mezclando pacientes ajenos', getDocs(query(C(B, 'consultas'), where('pacienteId', 'in', ['pB', 'pA']))), 'fail');
  await t('doctor: crear consulta en paciente ajeno', addDoc(C(B, 'consultas'), { pacienteId: 'pA', doctorId: 'docB' }), 'fail');
  await t('doctor: documentos de paciente ajeno', getDocs(query(C(B, 'documentos'), where('pacienteId', '==', 'pA'))), 'fail');
  await t('doctor: listar documentos sin filtro', getDocs(C(B, 'documentos')), 'fail');
  await t('doctor: respuestas de formularios de paciente ajeno', getDocs(query(C(B, 'formularios_paciente'), where('pacienteId', '==', 'pA'))), 'fail');
  await t('doctor: respuestas (campo antiguo patientId) de paciente ajeno', getDocs(query(C(B, 'formularios_paciente'), where('patientId', '==', 'pA'))), 'fail');
  await t('doctor: respuestas (campo antiguo paciente_id) de paciente ajeno', getDocs(query(C(B, 'formularios_paciente'), where('paciente_id', '==', 'pA'))), 'fail');
  await t('doctor: crear respuesta sobre paciente ajeno', addDoc(C(B, 'formularios_paciente'), { pacienteId: 'pA', doctorId: 'docB' }), 'fail');
  await t('doctor: formularios asignados a cita ajena', getDocs(query(C(B, 'formularios_citas'), where('citaId', '==', 'cA'))), 'fail');
  await t('doctor: asignar formulario a cita ajena', addDoc(C(B, 'formularios_citas'), { citaId: 'cA', doctorId: 'docB' }), 'fail');
  await t('doctor: formularios clínicos de otro médico', getDocs(query(C(B, 'formularios_clinicos'), where('creado_por', '==', 'docA'))), 'fail');
  await t('doctor: listar formularios clínicos sin filtro', getDocs(C(B, 'formularios_clinicos')), 'fail');
  await t('doctor: crear formulario a nombre de otro', addDoc(C(B, 'formularios_clinicos'), { creado_por: 'docA' }), 'fail');
  await t('doctor: editar formulario de otro', updateDoc(doc(B, 'formularios_clinicos/fA'), { nombre: 'hack' }), 'fail');
  await t('doctor: listar expedientes sin filtro', getDocs(C(B, 'expedientes')), 'fail');
  await t('doctor: expedientes de otro médico', getDocs(query(C(B, 'expedientes'), where('medico_id', '==', 'docA'))), 'fail');
  await t('doctor: leer configuración de otro', getDoc(doc(B, 'configuracion/docA')), 'fail');
  await t('doctor: escribir configuración de otro', setDoc(doc(B, 'configuracion/docA'), { nombre: 'hack' }), 'fail');
  await t('administrador: NO lee pacientes de un doctor', getDoc(doc(ADM, 'pacientes/pA')), 'fail');
  await t('administrador: NO lista pacientes sin filtro', getDocs(C(ADM, 'pacientes')), 'fail');
  await t('doctor: leer auditorías', getDocs(C(B, 'auditorias')), 'fail');
  await t('sin sesión: modificar una auditoría', updateDoc(doc(anon, 'auditorias/au1'), { estado: 'x' }), 'fail');
  await t('sin sesión: auditoría con campos extra', addDoc(C(anon, 'auditorias'), { email: 'a', evento: 'LOGIN', estado: 'x', detalle: 'y', fecha: new Date(), rol: 'administrador' }), 'fail');
  await t('login: listar intentos_login', getDocs(C(anon, 'intentos_login')), 'fail');
  await t('login: reiniciar contador sin ser el dueño (sin sesión)', updateDoc(doc(anon, 'intentos_login/a@x.com'), { intentosFallidos: 0, bloqueadoHasta: null }), 'fail');
  await t('login: reiniciar contador de otro correo (doctor B sobre A)', updateDoc(doc(B, 'intentos_login/a@x.com'), { intentosFallidos: 0, bloqueadoHasta: null }), 'fail');
  await t('login: saltar varios intentos de golpe', updateDoc(doc(anon, 'intentos_login/nuevo@x.com'), { intentosFallidos: 9, bloqueadoHasta: null }), 'fail');
  await t('login: bloqueo de un año', updateDoc(doc(anon, 'intentos_login/nuevo@x.com'), { intentosFallidos: 2, bloqueadoHasta: new Date(Date.now() + 365 * 24 * 3600 * 1000) }), 'fail');
  await t('login: crear contador con valor distinto de 1', setDoc(doc(anon, 'intentos_login/otro@x.com'), { intentosFallidos: 0, bloqueadoHasta: null }), 'fail');
  await t('login: eliminar contador', deleteDoc(doc(anon, 'intentos_login/a@x.com')), 'fail');
  await t('colección desconocida (lectura)', getDocs(C(A, 'secretos')), 'fail');
  await t('colección desconocida (escritura)', addDoc(C(A, 'secretos'), { x: 1 }), 'fail');

  console.log(`\nRESUMEN: ${pass} OK / ${fail} FALLAS`);
  await env.cleanup();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERROR', e); process.exit(2); });
