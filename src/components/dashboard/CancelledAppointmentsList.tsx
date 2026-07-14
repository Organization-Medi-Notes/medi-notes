"use client";

import { useMemo } from "react";
import {
  CalendarX2,
  ChevronRight,
  Clock3,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CancelledAppointmentsListProps = {
  appointments: any[];
  onOpenAppointment: (appointment: any) => void;
};

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDateFromFirestore(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  if (typeof value === "string") {
    const localDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (localDateMatch) {
      const [, year, month, day] = localDateMatch;

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        0,
        0,
        0,
        0
      );
    }
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getAppointmentDateTime(appointment: any): Date | null {
  const dateValue =
    appointment?.fecha ??
    appointment?.fecha_cita ??
    appointment?.fechaCita ??
    appointment?.date;

  const date = getDateFromFirestore(dateValue);

  if (!date) return null;

  const time = String(
    appointment?.hora_inicio ??
      appointment?.horaInicio ??
      appointment?.hora ??
      "00:00"
  );

  const match = time.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function getAppointmentStatus(appointment: any) {
  return normalizeText(
    appointment?.estado ??
      appointment?.status ??
      appointment?.Estado ??
      appointment?.estado_cita ??
      appointment?.estadoCita
  );
}

function isCancelledStatus(status: string) {
  return (
    status === "cancelada" ||
    status === "cancelado" ||
    status.startsWith("cancelad")
  );
}

function getPatientName(appointment: any) {
  return (
    appointment?.paciente_nombre ??
    appointment?.pacienteNombre ??
    appointment?.paciente ??
    "Paciente sin nombre"
  );
}

function getAppointmentType(appointment: any) {
  return (
    appointment?.tipo_consulta ??
    appointment?.tipoConsulta ??
    appointment?.tipo ??
    "Consulta"
  );
}

function getAppointmentTime(appointment: any) {
  return (
    appointment?.hora_inicio ??
    appointment?.horaInicio ??
    appointment?.hora ??
    "Sin hora"
  );
}

function formatAppointmentDate(appointment: any) {
  const date = getAppointmentDateTime(appointment);

  if (!date) return "Fecha no disponible";

  return date.toLocaleDateString("es-CR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CancelledAppointmentsList({
  appointments,
  onOpenAppointment,
}: CancelledAppointmentsListProps) {
  const cancelledAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) =>
          isCancelledStatus(getAppointmentStatus(appointment))
        )
        .sort((first, second) => {
          const firstDate = getAppointmentDateTime(first)?.getTime() ?? 0;
          const secondDate = getAppointmentDateTime(second)?.getTime() ?? 0;

          return secondDate - firstDate;
        }),
    [appointments]
  );

  return (
    <section className="h-full space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <CalendarX2 className="h-5 w-5 text-red-500" />
          Citas canceladas
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Todas las citas marcadas como canceladas.
        </p>
      </div>

      <div className="card-notion h-[430px] overflow-hidden p-0">
        {cancelledAppointments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-400">
            <XCircle className="mb-3 h-10 w-10 opacity-20" />

            <p className="font-medium">No hay citas canceladas</p>

            <p className="mt-1 text-sm">
              Las citas marcadas como canceladas aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="max-h-[430px] divide-y overflow-y-auto">
            {cancelledAppointments.map((appointment, index) => (
              <button
                key={appointment?.id ?? index}
                type="button"
                onClick={() => onOpenAppointment(appointment)}
                className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 p-4 text-left transition hover:bg-gray-50"
              >
                <div className="rounded-xl border border-red-100 bg-red-50 px-2 py-2 text-center text-red-700">
                  <Clock3 className="mx-auto mb-1 h-4 w-4" />

                  <p className="text-sm font-bold">
                    {getAppointmentTime(appointment)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {getPatientName(appointment)}
                  </p>

                  <p className="mt-1 truncate text-xs text-gray-500">
                    {getAppointmentType(appointment)}
                  </p>

                  <p className="mt-2 text-xs capitalize text-gray-500">
                    {formatAppointmentDate(appointment)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="border-red-100 bg-red-50 text-red-700">
                    cancelada
                  </Badge>

                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}