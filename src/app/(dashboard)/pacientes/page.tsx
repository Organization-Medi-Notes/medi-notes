
"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, User, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { patientService } from "@/lib/firebase/db-service";
import { NewPatientForm } from "./components/NewPatientForm";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  async function loadPatients() {
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (error) {
      console.error("Error cargando pacientes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const handleFormFinished = () => {
    setIsFormOpen(false);
    loadPatients();
  };

  const filteredPatients = patients.filter(p => 
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_expediente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestione su base de datos de pacientes registrados.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 bg-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
            </DialogHeader>
            <NewPatientForm onFinished={handleFormFinished} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por nombre o expediente..." 
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

      <div className="card-notion p-0 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Cargando pacientes desde la nube...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <User className="w-12 h-12 mb-2 opacity-20" />
            <p>No se encontraron pacientes.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="font-bold py-4">Expediente</TableHead>
                <TableHead className="font-bold py-4">Paciente</TableHead>
                <TableHead className="font-bold py-4">Edad</TableHead>
                <TableHead className="font-bold py-4">Contacto</TableHead>
                <TableHead className="font-bold py-4">Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((p) => (
                <TableRow key={p.id} className="hover:bg-primary-light/30 transition-colors">
                  <TableCell className="font-code text-xs text-gray-500">{p.numero_expediente || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="font-semibold text-gray-900">{p.nombre} {p.apellidos}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{p.edad} años</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">{p.telefono}</span>
                      <span className="text-xs text-gray-400">{p.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "capitalize px-2.5 py-0.5 text-[10px] border-transparent",
                      p.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {p.activo ? "Activo" : "Inactivo"}
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
        )}
      </div>
    </div>
  );
}
