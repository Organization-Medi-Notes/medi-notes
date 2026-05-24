
"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { appointmentService } from "@/lib/firebase/db-service";

export default function ReportsPage() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processStats() {
      try {
        const apts = await appointmentService.getAll();
        
        // Procesar datos para los gráficos
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const stats = months.map(m => ({ name: m, consultas: 0, ingresos: 0 }));
        
        apts.forEach((a: any) => {
          let date;
          if (a.fecha instanceof Object) {
            date = new Date(a.fecha.seconds * 1000);
          } else {
            date = new Date(a.fecha);
          }
          
          const monthIndex = date.getMonth();
          if (stats[monthIndex]) {
            stats[monthIndex].consultas += 1;
            stats[monthIndex].ingresos += (a.precio || 0) / 1000000; // En millones
          }
        });

        setChartData(stats.filter(s => s.consultas > 0 || months.indexOf(s.name) <= new Date().getMonth()));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    processStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-primary" />
            Reportes y Estadísticas
          </h1>
          <p className="text-gray-500 mt-1">Analice el rendimiento y crecimiento de su práctica médica.</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-gray-400">Generando estadísticas en tiempo real...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Consultas por Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="consultas" fill="#2D6A9F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-notion p-0 overflow-hidden border-none shadow-subtle">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Ingresos Mensuales (Millones)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="ingresos" stroke="#6C63FF" strokeWidth={3} dot={{r: 6, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
