# 🩺 Medi Notes — Guía de Instalación Local

> Para ejecutar este proyecto en tu máquina, asegúrate de tener instalado **Node.js (v18 o superior)** y sigue estos pasos.

---

## 1. Preparar el Proyecto

Descarga los archivos en una carpeta local y abre una terminal en esa ubicación.

---

## 2. Instalar Dependencias

Ejecuta el siguiente comando para instalar todas las librerías necesarias (Next.js, Tailwind, Firebase, Genkit, etc.):

```bash
npm install
```

---

## 3. Configurar Variables de Entorno

Crea un archivo llamado `.env` en la raíz del proyecto y añade tus credenciales de **Firebase** y tu API Key de **Google Generative AI** (necesaria para el Asistente IA):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Genkit / Google AI (Para el Asistente)
GOOGLE_GENAI_API_KEY=tu_google_ai_api_key
```

---

## 4. Ejecutar el Servidor de Desarrollo

El proyecto está configurado para correr en el puerto **9002** por defecto (según el `package.json`). Ejecuta:

```bash
npm run dev
```

Ahora puedes abrir [http://localhost:9002](http://localhost:9002) en tu navegador.

---

## 5. Ejecutar Genkit *(Opcional — Para depurar la IA)*

Si deseas probar o depurar los flujos de Inteligencia Artificial de forma aislada usando la interfaz de Genkit, abre otra terminal y ejecuta:

```bash
npm run genkit:dev
```

Esto abrirá el **Genkit Developer UI** en el puerto **4000**.

---

## Notas Adicionales

- **Base de Datos:** El proyecto usa Firebase Firestore. Asegúrate de que las reglas de seguridad en tu consola de Firebase permitan la lectura/escritura o configura la autenticación correctamente.
- **Fuentes:** El proyecto utiliza Google Fonts (Plus Jakarta Sans y DM Sans), las cuales se cargan automáticamente desde el archivo `layout.tsx`.
