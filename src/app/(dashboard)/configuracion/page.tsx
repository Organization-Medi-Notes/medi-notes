"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Bell,
  Shield,
  Clock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { settingsService } from "@/lib/firebase/db-service";
import { useToast } from "@/hooks/use-toast";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await settingsService.getProfile();
        if (data) {
          setProfile(data);
        } else {
          setProfile({
            nombre: "Natalia",
            apellidos: "Solano",
            especialidad: "Pediatra",
            cedula_profesional: "MED-88291-CR",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      await settingsService.updateProfile(profile);

      toast({
        title: "Éxito",
        description: "Configuración guardada en la nube.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Campos requeridos",
        description: "Debe completar todos los campos de contraseña.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "La nueva contraseña y su confirmación deben ser iguales.",
        variant: "destructive",
      });
      return;
    }

    const user = auth.currentUser;

    if (!user || !user.email) {
      toast({
        title: "Sesión inválida",
        description: "Debe iniciar sesión nuevamente para cambiar la contraseña.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Contraseña actualizada",
        description: "Su contraseña fue cambiada correctamente.",
      });
    } catch (error) {
      toast({
        title: "No se pudo cambiar la contraseña",
        description:
          "Verifique que la contraseña actual sea correcta e intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-gray-900 flex items-center gap-3">
          <Settings className="text-primary" />
          Configuración
        </h1>
        <p className="text-gray-500 mt-1">
          Personalice su perfil y las preferencias del sistema.
        </p>
      </div>

      <div className="card-notion p-0 overflow-hidden bg-white border-none shadow-subtle">
        <Tabs defaultValue="profile" className="flex flex-col md:flex-row h-[700px]">
          <TabsList className="md:w-64 flex flex-col items-start justify-start bg-gray-50/50 border-r h-full p-4 space-y-1">
            <TabsTrigger
              value="profile"
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <User className="w-4 h-4" /> Perfil Profesional
            </TabsTrigger>

            <TabsTrigger
              value="notifications"
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Bell className="w-4 h-4" /> Notificaciones
            </TabsTrigger>

            <TabsTrigger
              value="clinic"
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Clock className="w-4 h-4" /> Horario y Precios
            </TabsTrigger>

            <TabsTrigger
              value="security"
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Shield className="w-4 h-4" /> Seguridad
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 p-8 overflow-y-auto flex flex-col justify-start">
            <TabsContent value="profile" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Información Personal</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input
                      value={profile.nombre}
                      onChange={(e) =>
                        setProfile({ ...profile, nombre: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input
                      value={profile.apellidos}
                      onChange={(e) =>
                        setProfile({ ...profile, apellidos: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Especialidad</Label>
                    <Input
                      value={profile.especialidad}
                      onChange={(e) =>
                        setProfile({ ...profile, especialidad: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cédula Profesional</Label>
                    <Input
                      value={profile.cedula_profesional}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          cedula_profesional: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-primary">
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="notifications"
              className="mt-0"
            >
              <div className="max-w-xs">
                <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-400">
                  Preferencias de Notificación
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  Configure cómo desea recibir recordatorios y alertas del sistema.
                </p>
              </div>
            </TabsContent>

            <TabsContent
              value="clinic"
              className="mt-0"
            >
              <div className="max-w-xs">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-bold text-gray-400">Horario de Consulta</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Defina sus horas de atención y precios base por tipo de consulta.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-0">
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Seguridad de la cuenta</h2>
    <p className="text-sm text-gray-500">
      Actualice su contraseña para mantener protegida su cuenta.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl pt-2">
      <div className="space-y-2">
        <Label>Contraseña actual</Label>
        <div className="relative">
          <Input
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Ingrese su contraseña actual"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showCurrentPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nueva contraseña</Label>
        <div className="relative">
          <Input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Ingrese una nueva contraseña"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNewPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2 md:col-span-2 max-w-md">
        <Label>Confirmar nueva contraseña</Label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita la nueva contraseña"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div className="pt-6 border-t">
    <Button
      onClick={handleChangePassword}
      disabled={changingPassword}
      className="bg-primary"
    >
      {changingPassword ? "Actualizando..." : "Actualizar contraseña"}
    </Button>
  </div>
</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}