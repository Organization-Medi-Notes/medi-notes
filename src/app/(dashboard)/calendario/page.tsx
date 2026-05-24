
"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { appointmentService } from "@/lib/firebase/db-service";

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApts() {
      try {
        const data = await appointmentService.getAll();
        setAppointments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadApts();
  }, []);

  const selectedDayApts = appointments.filter(a => {
    if (!date) return false;
    let aptDate;
    if (a.fecha instanceof Object) {
      aptDate = new Date(a.fecha.seconds * 1000);
    } else {
      aptDate = new Date(a.fecha);
    }
    return aptDate.toDateString() === date.toDateString();
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="text-primary" />
            Calendario de Citas
          </h1>
          <p className="text-gray-500 mt-1">Organice y gestione sus consultas médicas.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card-notion p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-none"
            />
          </div>
          
          <div className="card-notion space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Estados</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-gray-600">Programada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-600">Completada</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="card-notion min-h-[600px] bg-white p-0 overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-lg">
                {date?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
            </div>
            
            <div className="flex-1 p-6">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p>Cargando agenda...</p>
                </div>
              ) : selectedDayApts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <CalendarIcon className="w-16 h-16 text-gray-100 mb-4" />
                  <h3 className="text-xl font-bold text-gray-300">Sin citas este día</h3>
                  <p className="text-gray-400 mt-2 max-w-xs">No hay consultas programadas para esta fecha en su base de datos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDayApts.map((apt, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="text-center w-16">
                        <p className="text-sm font-bold text-gray-900">{apt.hora_inicio}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{apt.paciente_nombre}</h4>
                        <p className="text-xs text-gray-500">{apt.tipo_consulta}</p>
                      </div>
                      <Badge className={
                        apt.estado === 'completada' ? "bg-emerald-50 text-emerald-700" :
                        apt.estado === 'confirmada' ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      }>
                        {apt.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
