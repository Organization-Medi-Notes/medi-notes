
"use client";

import { Settings, User, Bell, Shield, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
          <Settings className="text-primary" />
          Configuración
        </h1>
        <p className="text-gray-500 mt-1">Personalice su perfil y las preferencias del sistema.</p>
      </div>

      <div className="card-notion p-0 overflow-hidden bg-white border-none shadow-subtle">
        <Tabs defaultValue="profile" className="flex flex-col md:flex-row h-[700px]">
          <TabsList className="md:w-64 flex flex-col items-start justify-start bg-gray-50/50 border-r h-full p-4 space-y-1">
            <TabsTrigger value="profile" className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <User className="w-4 h-4" /> Perfil Profesional
            </TabsTrigger>
            <TabsTrigger value="notifications" className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4" /> Notificaciones
            </TabsTrigger>
            <TabsTrigger value="clinic" className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="w-4 h-4" /> Horario y Precios
            </TabsTrigger>
            <TabsTrigger value="security" className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4" /> Seguridad
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 p-8 overflow-y-auto">
            <TabsContent value="profile" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Información Personal</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input defaultValue="Rodrigo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input defaultValue="Alfaro" />
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidad</Label>
                    <Input defaultValue="Cardiología" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cédula Profesional</Label>
                    <Input defaultValue="MED-88291-CR" />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t">
                <Button className="bg-primary">Guardar Cambios</Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="flex items-center justify-center h-full text-center">
              <div className="max-w-xs">
                <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-400">Preferencias de Notificación</h3>
                <p className="text-sm text-gray-400 mt-2">Configure cómo desea recibir recordatorios y alertas del sistema.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="clinic" className="flex items-center justify-center h-full text-center">
              <div className="max-w-xs">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-400">Horario de Consulta</h3>
                <p className="text-sm text-gray-400 mt-2">Defina sus horas de atención y precios base por tipo de consulta.</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
