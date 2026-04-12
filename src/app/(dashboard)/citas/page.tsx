
"use client";

import { CalendarCheck, Search, Filter, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const appointments = [
  { id: 1, patient: "Maria Garcia", date: "2024-11-20", time: "09:00", type: "Seguimiento", status: "completada", price: "₡35,000" },
  { id: 2, patient: "Carlos Rodriguez", date: "2024-11-20", time: "10:30", type: "Primera Vez", status: "programada", price: "₡50,000" },
  { id: 3, patient: "Ana Lizano", date: "2024-11-20", time: "11:45", type: "Control", status: "confirmada", price: "₡35,000" },
  { id: 4, patient: "Juan Manuel Soto", date: "2024-11-20", time: "14:00", type: "Urgencia", status: "programada", price: "₡60,000" },
];

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <CalendarCheck className="text-primary" />
            Gestión de Citas
          </h1>
          <p className="text-gray-500 mt-1">Vea y administre el flujo de pacientes de su consultorio.</p>
        </div>
        <Button className="bg-primary hover:bg-primary-dark h-11">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por paciente..." 
            className="pl-10 h-11 border-gray-200 focus:ring-primary rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      <div className="card-notion p-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="py-4">Paciente</TableHead>
              <TableHead className="py-4">Fecha</TableHead>
              <TableHead className="py-4">Hora</TableHead>
              <TableHead className="py-4">Tipo</TableHead>
              <TableHead className="py-4">Estado</TableHead>
              <TableHead className="py-4">Monto</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((apt) => (
              <TableRow key={apt.id} className="hover:bg-gray-50/50">
                <TableCell className="font-semibold">{apt.patient}</TableCell>
                <TableCell>{apt.date}</TableCell>
                <TableCell className="font-medium">{apt.time}</TableCell>
                <TableCell>{apt.type}</TableCell>
                <TableCell>
                  <Badge className={cn(
                    "capitalize px-2.5 py-0.5 text-[10px]",
                    apt.status === 'completada' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                    apt.status === 'confirmada' && "bg-blue-50 text-blue-700 border-blue-100",
                    apt.status === 'programada' && "bg-amber-50 text-amber-700 border-amber-100",
                  )}>
                    {apt.status}
                  </Badge>
                </TableCell>
                <TableCell>{apt.price}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
