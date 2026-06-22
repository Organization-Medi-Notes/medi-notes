import { FormularioClinico } from "@/lib/types/formulario.types";

type PrintableResponse = {
  respuestas?: Record<string, unknown>;
  estado?: string;
  doctorId?: string;
  fecha?: unknown;
};

interface PrintFormularioOptions {
  formulario: FormularioClinico;
  patientName?: string;
  response?: PrintableResponse;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatFecha(fecha: unknown): string {
  if (!fecha) return "-";

  try {
    const date = (fecha as { toDate?: () => Date })?.toDate?.() ?? new Date(fecha as string | number | Date);
    return date.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Sin respuesta";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Sin respuesta";
    return value.map((item) => escapeHtml(item)).join(", ");
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return escapeHtml(value);
}

function buildFieldRows(formulario: FormularioClinico, respuestas?: Record<string, unknown>): string {
  const sortedCampos = formulario.campos.slice().sort((a, b) => a.orden - b.orden);

  return sortedCampos
    .map((campo) => {
      const value = respuestas?.[campo.id];
      return `
        <tr>
          <td>${escapeHtml(campo.etiqueta)}${campo.requerido ? " *" : ""}</td>
          <td>${escapeHtml(campo.tipo)}</td>
          <td>${formatFieldValue(value)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildDocumentHtml({ formulario, patientName, response }: PrintFormularioOptions): string {
  const estado = response?.estado ? escapeHtml(response.estado) : "-";
  const doctor = response?.doctorId ? escapeHtml(response.doctorId) : "-";
  const fecha = formatFecha(response?.fecha);
  const patient = patientName ? escapeHtml(patientName) : "No aplica";
  const especialidad = formulario.especialidad ? escapeHtml(formulario.especialidad) : "General";
  const descripcion = formulario.descripcion ? escapeHtml(formulario.descripcion) : "Sin descripción";
  const estadoFormulario = escapeHtml(formulario.estadoFormulario ?? "activo");
  const fieldsRows = buildFieldRows(formulario, response?.respuestas);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(formulario.nombre)} - Impresión</title>
        <style>
          :root {
            color-scheme: light;
          }
          body {
            margin: 24px;
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: #0f172a;
          }
          h1 {
            margin: 0;
            font-size: 22px;
          }
          .subtitle {
            margin: 4px 0 16px;
            color: #475569;
            font-size: 13px;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
          }
          .meta-item {
            font-size: 12px;
          }
          .meta-label {
            display: block;
            color: #64748b;
            margin-bottom: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
            vertical-align: top;
            font-size: 12px;
          }
          th {
            background: #f1f5f9;
            font-weight: 600;
          }
          @media print {
            body {
              margin: 12mm;
            }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(formulario.nombre)}</h1>
        <p class="subtitle">${descripcion}</p>

        <section class="meta">
          <div class="meta-item"><span class="meta-label">Paciente</span>${patient}</div>
          <div class="meta-item"><span class="meta-label">Especialidad</span>${especialidad}</div>
          <div class="meta-item"><span class="meta-label">Versión</span>v${escapeHtml(formulario.version)}</div>
          <div class="meta-item"><span class="meta-label">Estado formulario</span>${estadoFormulario}</div>
          <div class="meta-item"><span class="meta-label">Estado respuesta</span>${estado}</div>
          <div class="meta-item"><span class="meta-label">Doctor</span>${doctor}</div>
          <div class="meta-item"><span class="meta-label">Fecha registro</span>${fecha}</div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Tipo</th>
              <th>Respuesta</th>
            </tr>
          </thead>
          <tbody>
            ${fieldsRows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function printInIframe(html: string): boolean {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    iframe.remove();
    return false;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const cleanup = () => {
    setTimeout(() => {
      iframe.remove();
    }, 250);
  };

  frameWindow.onafterprint = cleanup;

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 200);

  return true;
}

function printInPopup(html: string): boolean {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  }, 200);

  return true;
}

export function printFormularioClinico(options: PrintFormularioOptions): void {
  const html = buildDocumentHtml(options);
  if (printInIframe(html)) return;
  if (printInPopup(html)) return;

  throw new Error("No se pudo iniciar la impresión desde el navegador.");
}
