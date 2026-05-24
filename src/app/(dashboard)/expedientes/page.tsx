
"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Plus, Filter, FileSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { medicalRecordService } from "@/lib/firebase/db-service";

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadRecords() {
      try {
        const data = await medicalRecordService.getAll();
        setRecords(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  const filtered = records.filter(r => 
    r.paciente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.diagnostico_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-primary" />
            Expedientes Clínicos
          </h1>
          <p className="text-gray-500 mt-1">Acceda al historial médico completo de sus pacientes.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por paciente o diagnóstico..." 
            className="pl-10 h-12 border-gray-200 focus:ring-primary rounded-lg text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-12 px-6">
          <Filter className="w-4 h-4 mr-2" />
          Filtros Avanzados
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-gray-400">Cargando expedientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((record) => (
            <div key={record.id} className="card-notion group hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-primary-light transition-colors">
                  <FileText className="text-gray-400 group-hover:text-primary" />
                </div>
                <span className="text-xs font-code text-gray-400">MOD: {record.actualizado_en instanceof Object ? new Date(record.actualizado_en.seconds * 1000).toLocaleDateString() : 'Reciente'}</span>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{record.paciente_nombre}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{record.diagnostico_principal || 'Sin diagnóstico registrado'}</p>
              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-primary">Ver Historia Completa</span>
                <FileSearch className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
          
          <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer min-h-[220px]">
            <Plus className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">Crear Nuevo Expediente</p>
          </div>
        </div>
      )}
    </div>
  );
}
