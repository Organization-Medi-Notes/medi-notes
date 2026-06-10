import { Timestamp } from "firebase/firestore";

export type CampoTipo =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "diagnostico"
  | "medicamento";

export interface CampoFormulario {
  id: string;
  tipo: CampoTipo;
  etiqueta: string;
  placeholder: string;
  requerido: boolean;
  opciones: string[];
  orden: number;
}

export interface FormularioClinico {
  id?: string;
  nombre: string;
  descripcion: string;
  especialidad: string;
  campos: CampoFormulario[];
  version: number;
  activo: boolean;
  creado_por: string;
  creado_en: Timestamp;
  modificado_en: Timestamp;
}
