"use client";

import { useMemo } from "react";
import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  ReceiptText,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DashboardFinancialAnalysisProps = {
  appointments: any[];
  periodLabel: string;
};

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function getAppointmentAmount(appointment: any) {
  const value =
    appointment?.monto ??
    appointment?.precio ??
    appointment?.amount ??
    0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
  }

  return 0;
}

function formatCurrency(value: number) {
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

function isScheduledStatus(status: string) {
  return status === "programada" || status === "programado";
}

function isConfirmedStatus(status: string) {
  return status === "confirmada" || status === "confirmado";
}

function isCompletedStatus(status: string) {
  return status === "completada" || status === "completado";
}

function isCancelledStatus(status: string) {
  return (
    status === "cancelada" ||
    status === "cancelado" ||
    status.startsWith("cancelad")
  );
}

export function DashboardFinancialAnalysis({
  appointments,
  periodLabel,
}: DashboardFinancialAnalysisProps) {
  const analysis = useMemo(() => {
    const scheduledAppointments = appointments.filter((appointment) =>
      isScheduledStatus(getAppointmentStatus(appointment))
    );

    const confirmedAppointments = appointments.filter((appointment) =>
      isConfirmedStatus(getAppointmentStatus(appointment))
    );

    const completedAppointments = appointments.filter((appointment) =>
      isCompletedStatus(getAppointmentStatus(appointment))
    );

    const cancelledAppointments = appointments.filter((appointment) =>
      isCancelledStatus(getAppointmentStatus(appointment))
    );

    const scheduledAmount = scheduledAppointments.reduce(
      (total, appointment) => total + getAppointmentAmount(appointment),
      0
    );

    const confirmedAmount = confirmedAppointments.reduce(
      (total, appointment) => total + getAppointmentAmount(appointment),
      0
    );

    const completedAmount = completedAppointments.reduce(
      (total, appointment) => total + getAppointmentAmount(appointment),
      0
    );

    const cancelledAmount = cancelledAppointments.reduce(
      (total, appointment) => total + getAppointmentAmount(appointment),
      0
    );

    /*
      REGLAS FINANCIERAS

      Ingreso realizado:
      - Solo citas completadas.

      Ingreso potencial pendiente:
      - Citas programadas + confirmadas.

      Ingreso potencial no realizado:
      - Citas canceladas.

      Las citas confirmadas NO se consideran ingreso real porque el sistema
      no registra si hubo depósito, devolución ni monto efectivamente cobrado.
    */
    const realizedIncome = completedAmount;
    const pendingPotentialIncome = scheduledAmount + confirmedAmount;

    const averagePerCompletedAppointment =
      completedAppointments.length === 0
        ? 0
        : realizedIncome / completedAppointments.length;

    const totalTrackedAppointments =
      scheduledAppointments.length +
      confirmedAppointments.length +
      completedAppointments.length +
      cancelledAppointments.length;

    const completionRate =
      totalTrackedAppointments === 0
        ? 0
        : (completedAppointments.length / totalTrackedAppointments) * 100;

    const cancellationRate =
      totalTrackedAppointments === 0
        ? 0
        : (cancelledAppointments.length / totalTrackedAppointments) * 100;

    const pendingRate =
      totalTrackedAppointments === 0
        ? 0
        : ((scheduledAppointments.length + confirmedAppointments.length) /
            totalTrackedAppointments) *
          100;

    return {
      realizedIncome,
      pendingPotentialIncome,
      averagePerCompletedAppointment,

      scheduledAmount,
      confirmedAmount,
      completedAmount,
      cancelledAmount,

      scheduledCount: scheduledAppointments.length,
      confirmedCount: confirmedAppointments.length,
      completedCount: completedAppointments.length,
      cancelledCount: cancelledAppointments.length,

      totalTrackedAppointments,
      completionRate,
      cancellationRate,
      pendingRate,
    };
  }, [appointments]);

  const maximumAmount = Math.max(
    analysis.scheduledAmount,
    analysis.confirmedAmount,
    analysis.completedAmount,
    analysis.cancelledAmount,
    1
  );

  const financialCards = [
    {
      label: "Ingresos realizados",
      value: formatCurrency(analysis.realizedIncome),
      caption: `${analysis.completedCount} ${
        analysis.completedCount === 1
          ? "cita completada"
          : "citas completadas"
      }`,
      icon: Banknote,
      className: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Promedio por cita completada",
      value: formatCurrency(analysis.averagePerCompletedAppointment),
      caption: "Calculado únicamente con citas completadas",
      icon: CircleDollarSign,
      className: "bg-purple-50 text-purple-700",
    },
    {
      label: "Ingreso potencial pendiente",
      value: formatCurrency(analysis.pendingPotentialIncome),
      caption: `${analysis.scheduledCount + analysis.confirmedCount} ${
        analysis.scheduledCount + analysis.confirmedCount === 1
          ? "cita programada o confirmada"
          : "citas programadas o confirmadas"
      }`,
      icon: CalendarClock,
      className: "bg-blue-50 text-blue-700",
    },
    {
      label: "Ingreso potencial no realizado",
      value: formatCurrency(analysis.cancelledAmount),
      caption: `${analysis.cancelledCount} ${
        analysis.cancelledCount === 1
          ? "cita cancelada"
          : "citas canceladas"
      }`,
      icon: XCircle,
      className: "bg-red-50 text-red-700",
    },
  ];

  const breakdown = [
    {
      label: "Programadas",
      description: "Monto potencial todavía pendiente de confirmación",
      value: analysis.scheduledAmount,
      count: analysis.scheduledCount,
      barClassName: "bg-amber-500",
    },
    {
      label: "Confirmadas",
      description: "Monto potencial, no ingreso realizado",
      value: analysis.confirmedAmount,
      count: analysis.confirmedCount,
      barClassName: "bg-blue-500",
    },
    {
      label: "Completadas",
      description: "Ingreso realizado del período",
      value: analysis.completedAmount,
      count: analysis.completedCount,
      barClassName: "bg-emerald-500",
    },
    {
      label: "Canceladas",
      description: "Ingreso potencial no realizado",
      value: analysis.cancelledAmount,
      count: analysis.cancelledCount,
      barClassName: "bg-red-500",
    },
  ];

  const indicators = [
    {
      label: "Tasa de finalización",
      value: formatPercentage(analysis.completionRate),
      caption: "Citas completadas sobre el total",
      icon: TrendingUp,
      className: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Tasa de cancelación",
      value: formatPercentage(analysis.cancellationRate),
      caption: "Citas canceladas sobre el total",
      icon: XCircle,
      className: "bg-red-50 text-red-700",
    },
    {
      label: "Agenda pendiente",
      value: formatPercentage(analysis.pendingRate),
      caption: "Programadas y confirmadas sobre el total",
      icon: Gauge,
      className: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <ReceiptText className="h-5 w-5 text-primary" />
            Análisis financiero
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Los ingresos realizados se calculan únicamente con citas completadas.
          </p>
        </div>

        <Badge className="border-gray-100 bg-gray-50 text-gray-700">
          {periodLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {financialCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="card-notion p-6">
              <div
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${card.className}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <p className="text-sm font-medium text-gray-500">{card.label}</p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {card.value}
              </p>

              <p className="mt-1 text-xs text-gray-400">{card.caption}</p>
            </div>
          );
        })}
      </div>

      <div className="card-notion p-6">
        <div className="mb-6">
          <h4 className="font-bold text-gray-900">
            Flujo de dinero por estado
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Las programadas y confirmadas representan montos potenciales. Solo
            las completadas forman parte del ingreso realizado.
          </p>
        </div>

        <div className="space-y-6">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>

                    <span className="text-xs text-gray-400">
                      {item.count} {item.count === 1 ? "cita" : "citas"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    {item.description}
                  </p>
                </div>

                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(item.value)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${item.barClassName}`}
                  style={{
                    width:
                      item.value === 0
                        ? "0%"
                        : `${Math.max(
                            8,
                            (item.value / maximumAmount) * 100
                          )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h4 className="font-bold text-gray-900">
            Indicadores para toma de decisiones
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Resumen del comportamiento de las citas durante el período.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {indicators.map((indicator) => {
            const Icon = indicator.icon;

            return (
              <div key={indicator.label} className="card-notion p-6">
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${indicator.className}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p className="text-sm font-medium text-gray-500">
                  {indicator.label}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {indicator.value}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {indicator.caption}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}