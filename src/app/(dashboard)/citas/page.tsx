
"use client";

import { useState, useEffect } from "react";
import { CalendarCheck, Search, Filter, Plus, MoreVertical, Loader2 } from "lucide-react";
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
import { appointmentService } from "@/lib/firebase/db-service";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await appointmentService.getAll();
        setAppointments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = appointments.filter(a => 
    a.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      <div className="card-notion p-0 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-gray-400">Sincronizando agenda...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <CalendarCheck className="w-12 h-12 mb-2 opacity-20" />
            <p>No se encontraron citas registradas.</p>
          </div>
        ) : (
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
              {filtered.map((apt) => (
                <TableRow key={apt.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-semibold">{apt.paciente_nombre}</TableCell>
                  <TableCell>{apt.fecha instanceof Object ? new Date(apt.fecha.seconds * 1000).toLocaleDateString() : apt.fecha}</TableCell>
                  <TableCell className="font-medium">{apt.hora_inicio}</TableCell>
                  <TableCell>{apt.tipo_consulta}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "capitalize px-2.5 py-0.5 text-[10px]",
                      apt.estado === 'completada' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                      apt.estado === 'confirmada' && "bg-blue-50 text-blue-700 border-blue-100",
                      apt.estado === 'programada' && "bg-amber-50 text-amber-700 border-amber-100",
                    )}>
                      {apt.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{apt.precio ? `₡${apt.precio.toLocaleString()}` : "N/A"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
