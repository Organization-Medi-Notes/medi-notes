"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardCalendarPreviewProps = {
  appointments: any[];
  onOpenAppointment: (appointment: any) => void;
  onOpenCalendar: () => void;
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

function isSameDay(first: Date, second: Date) {
  return (
    first.getDate() === second.getDate() &&
    first.getMonth() === second.getMonth() &&
    first.getFullYear() === second.getFullYear()
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

function getAppointmentPatientName(appointment: any) {
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

function getAppointmentStatus(appointment: any) {
  return String(appointment?.estado ?? "programada").toLowerCase();
}

function getStatusClass(status: string) {
  if (status === "confirmada") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (status === "completada" || status === "completado") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (status === "cancelada") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSelectedDate(date: Date) {
  return capitalizeFirst(
    date.toLocaleDateString("es-CR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  );
}

export function DashboardCalendarPreview({
  appointments,
  onOpenAppointment,
  onOpenCalendar,
}: DashboardCalendarPreviewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const appointmentDates = useMemo(
    () =>
      appointments
        .map((appointment) => getDateFromFirestore(appointment?.fecha))
        .filter((date): date is Date => Boolean(date)),
    [appointments]
  );

  const selectedDayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const appointmentDate = getDateFromFirestore(appointment?.fecha);
          return appointmentDate
            ? isSameDay(appointmentDate, selectedDate)
            : false;
        })
        .sort((first, second) =>
          String(getAppointmentTime(first)).localeCompare(
            String(getAppointmentTime(second))
          )
        ),
    [appointments, selectedDate]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendario de citas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Seleccione una fecha para consultar las citas registradas.
          </p>
        </div>

        <Button
          variant="ghost"
          className="justify-start text-sm text-primary sm:justify-center"
          onClick={onOpenCalendar}
        >
          Ver Día, Semana y Mes
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="card-notion overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="border-b p-5 lg:border-b-0 lg:border-r">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setMonth(date);
                }
              }}
              month={month}
              onMonthChange={setMonth}
              modifiers={{
                hasAppointment: appointmentDates,
              }}
              modifiersClassNames={{
                hasAppointment:
                  "bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200",
              }}
              className="mx-auto rounded-md border-none"
            />

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full border border-purple-300 bg-purple-100" />
              <span>Días con citas registradas</span>
            </div>
          </div>

          <div className="min-h-[360px]">
            <div className="border-b bg-gray-50/50 p-5">
              <h3 className="font-bold text-gray-900">
                {formatSelectedDate(selectedDate)}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {selectedDayAppointments.length === 0
                  ? "No hay citas para esta fecha."
                  : `${selectedDayAppointments.length} ${
                      selectedDayAppointments.length === 1 ? "cita" : "citas"
                    } registradas.`}
              </p>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="flex min-h-[290px] flex-col items-center justify-center px-6 text-center text-gray-400">
                <CalendarCheck className="mb-3 h-11 w-11 opacity-20" />
                <p className="font-medium">Sin citas este día</p>
                <p className="mt-1 max-w-xs text-sm">
                  Seleccione en el calendario una fecha resaltada para ver sus
                  consultas.
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] divide-y overflow-y-auto">
                {selectedDayAppointments.map((appointment, index) => {
                  const status = getAppointmentStatus(appointment);

                  return (
                    <button
                      key={appointment?.id ?? index}
                      type="button"
                      onClick={() => onOpenAppointment(appointment)}
                      className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 p-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-2 py-2 text-center text-blue-700">
                        <Clock className="mx-auto mb-1 h-4 w-4" />
                        <p className="text-sm font-bold">
                          {getAppointmentTime(appointment)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {getAppointmentPatientName(appointment)}
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {getAppointmentType(appointment)}
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
        </div>
      </div>
    </section>
  );
}