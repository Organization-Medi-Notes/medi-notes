
"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

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
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Hoy</Button>
                <div className="flex border rounded-md">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r"><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <CalendarIcon className="w-16 h-16 text-gray-100 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">Vista de Agenda</h3>
              <p className="text-gray-400 mt-2 max-w-xs">Seleccione una fecha para ver las citas programadas en detalle.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
