"use client";

import { 
  Users, 
  CalendarCheck, 
  XCircle, 
  DollarSign, 
  MoreVertical, 
  ChevronRight,
  Clock,
  UserPlus,
  FilePenLine,
  Stethoscope
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dashboardMetrics = [
  { title: "Citas Hoy", value: 8, change: "+12%", trend: 'up' as const, icon: CalendarCheck, colorClass: "bg-blue-50 text-blue-600" },
  { title: "Pacientes Mes", value: 142, change: "+5%", trend: 'up' as const, icon: Users, colorClass: "bg-purple-50 text-purple-600" },
  { title: "Cancelaciones", value: 4, change: "-2%", trend: 'down' as const, icon: XCircle, colorClass: "bg-rose-50 text-rose-600" },
  { title: "Ingresos Mes", value: "₡1.2M", change: "+8%", trend: 'up' as const, icon: DollarSign, colorClass: "bg-emerald-50 text-emerald-600" },
];

const todayAppointments = [
  { time: "09:00", patient: "Maria Garcia", type: "Seguimiento", status: "completada" },
  { time: "10:30", patient: "Carlos Rodriguez", type: "Primera Vez", status: "programada" },
  { time: "11:45", patient: "Ana Lizano", type: "Control", status: "confirmada" },
  { time: "14:00", patient: "Juan Manuel Soto", type: "Urgencia", status: "programada" },
];

const recentActivity = [
  { type: "paciente", text: "Nuevo paciente registrado: Sofía Méndez", time: "Hace 15 min", icon: UserPlus, iconBg: "bg-blue-100 text-blue-600" },
  { type: "expediente", text: "Expediente actualizado para Carlos R.", time: "Hace 45 min", icon: FilePenLine, iconBg: "bg-purple-100 text-purple-600" },
  { type: "cita", text: "Cita completada con éxito - Maria G.", time: "Hace 1 hora", icon: CalendarCheck, iconBg: "bg-emerald-100 text-emerald-600" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Bienvenido, Dr. Solano</h1>
          <p className="text-gray-500 mt-1">Aquí está lo que está pasando hoy en su consultorio.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11">Configuración</Button>
          <Button className="h-11 bg-accent hover:bg-accent/90">Nueva Cita</Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((m, idx) => (
          <MetricCard key={idx} {...m} />
        ))}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Citas para hoy
            </h2>
            <Button variant="ghost" className="text-sm text-primary">Ver todas</Button>
          </div>
          <div className="card-notion overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
              {todayAppointments.map((apt, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-gray-900 w-12">{apt.time}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors cursor-pointer">{apt.patient}</h4>
                      <p className="text-xs text-gray-500">{apt.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      apt.status === 'completada' ? 'secondary' : 
                      apt.status === 'confirmada' ? 'default' : 'outline'
                    } className={cn(
                      "capitalize px-3 py-1 text-[10px]",
                      apt.status === 'completada' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                      apt.status === 'confirmada' && "bg-blue-50 text-blue-700 border-blue-100",
                      apt.status === 'programada' && "bg-amber-50 text-amber-700 border-amber-100",
                    )}>
                      {apt.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="text-gray-400">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-3 text-center">
              <Button variant="link" className="text-xs text-gray-500 h-auto p-0">Ver calendario completo</Button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Actividad reciente</h2>
          </div>
          <div className="card-notion p-6 space-y-6">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex gap-4 items-start relative pb-6 last:pb-0">
                {idx !== recentActivity.length - 1 && (
                  <div className="absolute left-4 top-10 bottom-0 w-[1px] bg-gray-100"></div>
                )}
                <div className={cn("p-2 rounded-lg shrink-0 z-10", activity.iconBg)}>
                  <activity.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
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
