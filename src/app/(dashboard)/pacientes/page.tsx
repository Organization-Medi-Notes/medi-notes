
"use client";

import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, User, Users } from "lucide-react";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const mockPatients = [
  { id: "1", expediente: "EXP-00001", nombre: "Maria Garcia", edad: 45, telefono: "8888-1234", email: "maria@example.com", ultima: "12 Oct 2024", estado: "activo" },
  { id: "2", expediente: "EXP-00002", nombre: "Carlos Rodriguez", edad: 32, telefono: "7777-5678", email: "carlos@example.com", ultima: "05 Nov 2024", estado: "activo" },
  { id: "3", expediente: "EXP-00003", nombre: "Ana Lizano", edad: 28, telefono: "6666-9012", email: "ana@example.com", ultima: "20 Oct 2024", estado: "inactivo" },
  { id: "4", expediente: "EXP-00004", nombre: "Juan Manuel Soto", edad: 54, telefono: "8888-4444", email: "juan@example.com", ultima: "Hoy", estado: "activo" },
];

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestione su base de datos de pacientes registrados.</p>
        </div>
        <Button className="h-11 bg-primary hover:bg-primary-dark">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por nombre, cédula o expediente..." 
            className="pl-10 h-11 border-gray-200 focus:ring-primary rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-11">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="card-notion p-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold py-4">Expediente</TableHead>
              <TableHead className="font-bold py-4">Paciente</TableHead>
              <TableHead className="font-bold py-4">Edad</TableHead>
              <TableHead className="font-bold py-4">Contacto</TableHead>
              <TableHead className="font-bold py-4">Última Consulta</TableHead>
              <TableHead className="font-bold py-4">Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPatients.map((p) => (
              <TableRow key={p.id} className="hover:bg-primary-light/30 transition-colors">
                <TableCell className="font-code text-xs text-gray-500">{p.expediente}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="font-semibold text-gray-900">{p.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{p.edad} años</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{p.telefono}</span>
                    <span className="text-xs text-gray-400">{p.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{p.ultima}</TableCell>
                <TableCell>
                  <Badge className={cn(
                    "capitalize px-2.5 py-0.5 text-[10px] border-transparent",
                    p.estado === 'activo' ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {p.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer">Ver Perfil</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-primary">Nueva Cita</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">Editar</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-rose-600">Archivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
