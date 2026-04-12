# **App Name**: Medi Notes

## Core Features:

- Autenticación del Médico: Sistema de inicio de sesión con email y contraseña, recuperación de contraseña, protección de rutas y manejo de sesión persistente con Firebase Authentication.
- Gestión de Pacientes: Permite crear, editar, buscar y listar perfiles de pacientes con información personal, de contacto y antecedentes médicos, con paginación y filtros.
- Gestión de Expedientes Clínicos: Registro y consulta detallada de expedientes clínicos por paciente y cita, incluyendo signos vitales, anamnesis, diagnóstico, plan de tratamiento y medicamentos recetados. Incluye autoguardado y validación.
- Calendario y Gestión de Citas: Visualización y gestión de citas en un calendario interactivo con vistas de mes, semana y día. Permite programar nuevas citas con validación de horario y conflictos, y actualizar estados de citas.
- Gestor de Plantillas de Formularios: Herramienta para crear y gestionar plantillas de formularios de consulta personalizables con un constructor drag-and-drop, que pueden ser usados e integrados en los expedientes de los pacientes.
- Panel de Control (Dashboard): Visualización de métricas clave diarias y mensuales, lista de citas del día, gráficos de consultas y un feed de actividad reciente para una visión general rápida del consultorio.
- Generación de Reportes Personalizados: Creación de reportes detallados sobre consultas, pacientes, ingresos y tasas de cancelación, con filtros de fecha y funcionalidad de exportación a CSV.
- Configuración y Perfil del Médico: Permite al médico configurar su perfil, horario de consultorio, precios de consulta, moneda, y personalizar las opciones de notificación por email.
- Asistente Clínico con IA: Herramienta de inteligencia artificial para resumir notas clínicas, mejorar redacción médica, simplificar información para pacientes, traducir texto y sugerir diagnósticos diferenciales, actuando como un tool de apoyo clínico.
- Notificaciones Automáticas por Email: Envío automatizado de recordatorios de citas y otras notificaciones por email a pacientes, con plantillas personalizables y configuración SMTP. Registra el estado de los envíos.

## Style Guidelines:

- Esquema de color primario: Azul oscuro profesional (#2D6A9F) para elementos interactivos. Acento: Violeta vibrante (#6C63FF). Fondos: Blanco puro (#FFFFFF), con secundarios sutiles (#F4F6F9, #EAECF0). Colores de estado específicos para citas (azul, violeta, verde, rojo, ámbar).
- Fuente de display/headings: 'Plus Jakarta Sans'. Fuente de cuerpo/UI: 'DM Sans'. Fuente monoespaciada para IDs/códigos: 'JetBrains Mono'. Todas importadas de Google Fonts.
- Uso de íconos claros y modernos de 'lucide-react'. Logo 'Medi Notes' incluye un ícono de estetoscopio estilizado. Empty states se ilustran con íconos grandes.
- Sidebar izquierdo fijo de 260px con fondo oscuro (#1A2B3C). Diseño tipo Notion con espacios en blanco generosos. Cards con bordes sutiles y `border-radius: 12px` y sombras ligeras. Inputs con borde (`#E2E8F0`) y focus ring primario. Espaciado generoso (24px padding en cards, 16px gap, 32px márgenes entre secciones). Página de login centrada con gradiente sutil de fondo y card flotante. Breadcrumbs en todas las páginas internas.
- Animaciones suaves de fade-in (opacity 0 → 1, 200ms) al cargar páginas. Hover states sutiles en elementos interactivos con transición de `150ms ease`. Uso de skeleton loaders para estados de carga de datos en lugar de spinners genéricos.