"use client";

import { useMemo } from "react";
import {
  CalendarCheck,
  ChevronRight,
  Clock3,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PastAppointmentsListProps = {
  appointments: any[];
  onOpenAppointment: (appointment: any) => void;
};

function getDateFromFirestore(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value?.seconds) {
    return new Date(value.seconds * 1000);
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getAppointmentDateTime(appointment: any): Date | null {
  const date = getDateFromFirestore(appointment?.fecha);

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
  return String(appointment?.estado ?? "programada").toLowerCase();
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

function getStatusClass(status: string) {
  if (status === "completada" || status === "completado") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (status === "confirmada") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (status === "cancelada") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
}

export function PastAppointmentsList({
  appointments,
  onOpenAppointment,
}: PastAppointmentsListProps) {
  const pastAppointments = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((appointment) => {
        const appointmentDate = getAppointmentDateTime(appointment);
        const status = getAppointmentStatus(appointment);

        return (
          appointmentDate !== null &&
          appointmentDate < now &&
          status !== "cancelada"
        );
      })
      .sort((first, second) => {
        const firstDate = getAppointmentDateTime(first)?.getTime() ?? 0;
        const secondDate = getAppointmentDateTime(second)?.getTime() ?? 0;

        return secondDate - firstDate;
      });
  }, [appointments]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <History className="h-5 w-5 text-primary" />
          Citas pasadas
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Consultas anteriores ordenadas desde la más reciente.
        </p>
      </div>

      <div className="card-notion overflow-hidden p-0">
        {pastAppointments.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center text-gray-400">
            <CalendarCheck className="mb-3 h-10 w-10 opacity-20" />

            <p className="font-medium">No hay citas pasadas</p>

            <p className="mt-1 text-sm">
              Las consultas anteriores aparecerán en esta sección.
            </p>
          </div>
        ) : (
          <div className="max-h-[430px] divide-y overflow-y-auto">
            {pastAppointments.map((appointment, index) => {
              const status = getAppointmentStatus(appointment);

              return (
                <button
                  key={appointment?.id ?? index}
                  type="button"
                  onClick={() => onOpenAppointment(appointment)}
                  className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 p-4 text-left transition hover:bg-gray-50"
                >
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center text-slate-700">
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
                    <Badge className={getStatusClass(status)}>
                      {status}
                    </Badge>

                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
