export type Sexo = "masculino" | "femenino" | "otro";
export type EstadoCita = "programada" | "confirmada" | "completada" | "cancelada" | "no_asistio";
export type TipoConsulta = "primera_vez" | "seguimiento" | "urgencia" | "control";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Medico {
  uid: string;
  nombre: string;
  apellidos: string;
  especialidad: string;
  cedula_profesional: string;
  email: string;
  telefono: string;
  consultorio: string;
  direccion_consultorio: string;
  foto_url?: string;
  configuracion: {
    duracion_consulta_min: number;
    horario_inicio: string;
    horario_fin: string;
    dias_laborales: number[];
    moneda: string;
    precio_consulta: number;
  };
  creado_en: any;
  actualizado_en: any;
}

export interface Paciente {
  id: string;
  medico_id: string;
  numero_expediente: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: any;
  edad: number;
  sexo: Sexo;
  cedula: string;
  telefono: string;
  telefono_emergencia?: string;
  email?: string;
  direccion?: string;
  ocupacion?: string;
  estado_civil?: string;
  tipo_sangre?: string;
  alergias?: string[];
  medicamentos_actuales?: string[];
  antecedentes_personales?: string;
  antecedentes_familiares?: string;
  notas_generales?: string;
  activo: boolean;
  creado_en: any;
  actualizado_en: any;
}

export interface Cita {
  id: string;
  medico_id: string;
  paciente_id: string;
  paciente_nombre: string;
  fecha: any;
  hora_inicio: string;
  hora_fin: string;
  duracion_min: number;
  tipo_consulta: TipoConsulta;
  motivo_consulta: string;
  estado: EstadoCita;
  notas_previas?: string;
  recordatorio_enviado: boolean;
  precio?: number;
  pagado: boolean;
  metodo_pago?: MetodoPago;
  creado_en: any;
  actualizado_en: any;
}

export interface SignosVitales {
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  temperatura?: number;
  peso?: number;
  talla?: number;
  imc?: number;
  saturacion_oxigeno?: number;
  frecuencia_respiratoria?: number;
}

export interface MedicamentoRecetado {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface Expediente {
  id: string;
  paciente_id: string;
  medico_id: string;
  cita_id?: string;
  fecha_consulta: any;
  motivo_consulta: string;
  signos_vitales: SignosVitales;
  anamnesis?: string;
  exploracion_fisica?: string;
  diagnostico_principal: string;
  diagnosticos_secundarios?: string[];
  plan_tratamiento: string;
  medicamentos_recetados?: MedicamentoRecetado[];
  indicaciones_paciente?: string;
  proxima_cita?: any;
  observaciones?: string;
  resumen_ia?: string;
  creado_en: any;
  actualizado_en: any;
}
