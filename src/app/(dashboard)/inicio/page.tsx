
"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  CalendarCheck, 
  XCircle, 
  DollarSign, 
  MoreVertical, 
  ChevronRight,
  Clock,
  UserPlus,
  Loader2
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appointmentService, patientService } from "@/lib/firebase/db-service";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [todayApts, allApts, pts] = await Promise.all([
          appointmentService.getToday(),
          appointmentService.getAll(),
          patientService.getAll()
        ]);
        setAppointments(todayApts);
        setAllAppointments(allApts);
        setPatientsCount(pts.length);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Cálculo funcional de ingresos del mes actual basado en datos de Firestore
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = allAppointments.reduce((acc, apt) => {
    const date = apt.fecha?.seconds ? new Date(apt.fecha.seconds * 1000) : new Date(apt.fecha);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && apt.estado === 'completada') {
      return acc + (apt.precio || 0);
    }
    return acc;
  }, 0);

  const cancellations = allAppointments.filter(apt => apt.estado === 'cancelada').length;

  const metrics = [
    { title: "Citas Hoy", value: appointments.length, change: "Hoy", trend: 'neutral' as const, icon: CalendarCheck, colorClass: "bg-blue-50 text-blue-600" },
    { title: "Pacientes Total", value: patientsCount, change: "Activos", trend: 'up' as const, icon: Users, colorClass: "bg-purple-50 text-purple-600" },
    { title: "Cancelaciones", value: cancellations, change: "Total", trend: 'down' as const, icon: XCircle, colorClass: "bg-rose-50 text-rose-600" },
    { title: "Ingresos Mes", value: `₡${monthlyRevenue.toLocaleString()}`, change: "Completadas", trend: 'up' as const, icon: DollarSign, colorClass: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Bienvenido, Dr. Solano</h1>
          <p className="text-gray-500 mt-1">Aquí está lo que está pasando hoy en su consultorio.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11">Configuración</Button>
          <Button className="h-11 bg-accent hover:bg-accent/90 text-white">Nueva Cita</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => (
            <MetricCard key={idx} {...m} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Citas para hoy
            </h2>
            <Button variant="ghost" className="text-sm text-primary">Ver todas</Button>
          </div>
          <div className="card-notion overflow-hidden p-0 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <CalendarCheck className="w-10 h-10 mb-2 opacity-20" />
                <p>No hay citas registradas para hoy.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appointments.map((apt, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-bold text-gray-900 w-12">{apt.hora_inicio}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors cursor-pointer">{apt.paciente_nombre}</h4>
                        <p className="text-xs text-gray-500">{apt.tipo_consulta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={cn(
                        "capitalize px-3 py-1 text-[10px]",
                        apt.estado === 'completada' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        apt.estado === 'confirmada' ? "bg-blue-50 text-blue-700 border-blue-100" : 
                        "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {apt.estado}
                      </Badge>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Actividad reciente</h2>
          </div>
          <div className="card-notion p-6 space-y-6">
            <div className="flex gap-4 items-start relative pb-6">
              <div className="absolute left-4 top-10 bottom-0 w-[1px] bg-gray-100"></div>
              <div className="p-2 rounded-lg shrink-0 z-10 bg-blue-100 text-blue-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sistema en línea</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2 text-xs">
              Ver registro completo
              <ChevronRight className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
