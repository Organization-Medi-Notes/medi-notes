
"use client";

import { BarChart3, Download, TrendingUp, Calendar, PieChart } from "lucide-react";
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

const data = [
  { name: "Ene", consultas: 45, ingresos: 1.2 },
  { name: "Feb", consultas: 52, ingresos: 1.5 },
  { name: "Mar", consultas: 48, ingresos: 1.3 },
  { name: "Abr", consultas: 61, ingresos: 1.8 },
  { name: "May", consultas: 55, ingresos: 1.6 },
  { name: "Jun", consultas: 67, ingresos: 2.1 },
];

export default function ReportsPage() {
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
              <BarChart data={data}>
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
              <LineChart data={data}>
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
    </div>
  );
}
