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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { settingsService } from "@/lib/firebase/db-service";
import { useToast } from "@/hooks/use-toast";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
  email: true,
  recordatoriosCitas: true,
  alertasSistema: true,
});

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [users, setUsers] = useState<any[]>([]);
const [loadingUsers, setLoadingUsers] = useState(false);
const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await settingsService.getProfile();

if (data) {
  setProfile(data);

  const dataAny = data as any;

if (dataAny.notifications) {
  setNotifications(dataAny.notifications);
}
} else {
  setProfile({
    nombre: "Natalia",
    apellidos: "Solano",
    especialidad: "Pediatra",
    cedula_profesional: "MED-88291-CR",
    email: auth.currentUser?.email ?? "",
    telefono: "",
  });
}
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    async function loadCurrentUserRole() {
  const user = auth.currentUser;

  if (!user) return;

  const userRef = doc(db, "usuarios", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    setCurrentUserRole(userSnap.data().rol ?? null);
  }
}

loadCurrentUserRole();
  }, []);

  useEffect(() => {
  loadUsers();
}, []);

  const loadUsers = async () => {
  setLoadingUsers(true);

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    const usersData = snapshot.docs.map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }));

    setUsers(usersData);
  } catch (error) {
    console.error("Error cargando usuarios:", error);

    toast({
      title: "Error",
      description: "No se pudieron cargar los usuarios.",
      variant: "destructive",
    });
  } finally {
    setLoadingUsers(false);
  }
};

const handleRoleChange = async (userId: string, newRole: string) => {
  setUpdatingUserId(userId);

  try {
    await updateDoc(doc(db, "usuarios", userId), {
      rol: newRole,
    });

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, rol: newRole } : user
      )
    );

    toast({
      title: "Rol actualizado",
      description: "El rol del usuario fue actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando rol:", error);

    toast({
      title: "Error",
      description: "No se pudo actualizar el rol del usuario.",
      variant: "destructive",
    });
  } finally {
    setUpdatingUserId(null);
  }
};

  const handleSave = async () => {
    setSaving(true);

    try {
      await settingsService.updateProfile({
  ...profile,
  notifications,
});

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
            {currentUserRole === "administrador" && (
  <TabsTrigger
    value="users"
    className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
  >
    <Users className="w-4 h-4" /> Usuarios y roles
  </TabsTrigger>
)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="email">Correo electrónico</Label>
    <Input
      id="email"
      type="email"
      value={profile.email || ""}
      disabled
      className="bg-muted"
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="telefono">Teléfono</Label>
    <Input
      id="telefono"
      value={profile.telefono || ""}
      onChange={(e) =>
        setProfile({ ...profile, telefono: e.target.value })
      }
      placeholder="Ej: 8703-9865"
    />
  </div>
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
  <Card>
    <CardHeader>
      <CardTitle>Preferencias de Notificaciones</CardTitle>
      <CardDescription>
        Configure qué alertas desea recibir dentro del sistema.
      </CardDescription>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="flex items-center justify-between">
        <span>Notificaciones por correo</span>
        <input
          type="checkbox"
          checked={notifications.email}
          onChange={(e) =>
            setNotifications({
              ...notifications,
              email: e.target.checked,
            })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <span>Recordatorios de citas</span>
        <input
          type="checkbox"
          checked={notifications.recordatoriosCitas}
          onChange={(e) =>
            setNotifications({
              ...notifications,
              recordatoriosCitas: e.target.checked,
            })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <span>Alertas del sistema</span>
        <input
          type="checkbox"
          checked={notifications.alertasSistema}
          onChange={(e) =>
            setNotifications({
              ...notifications,
              alertasSistema: e.target.checked,
            })
          }
        />
      </div>
      <div className="pt-4">
  <Button onClick={handleSave} disabled={saving}>
    {saving ? "Guardando..." : "Guardar Cambios"}
  </Button>
</div>
    </CardContent>
  </Card>
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
{currentUserRole === "administrador" && (
  <TabsContent value="users" className="space-y-6 mt-0">
  <div className="space-y-2">
    <h2 className="text-xl font-bold">Administración de usuarios y roles</h2>
    <p className="text-sm text-gray-500">
      Gestione el rol asignado a cada usuario registrado en el sistema.
    </p>
  </div>

  {loadingUsers ? (
    <div className="flex items-center gap-2 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Cargando usuarios...</span>
    </div>
  ) : (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <p className="font-semibold text-gray-900">
              {user.nombre} {user.apellidos}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              UID: {user.uid ?? user.id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-sm">Rol</Label>

            <select
              value={user.rol ?? "doctor"}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              disabled={updatingUserId === user.id}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="doctor">Doctor</option>
              <option value="asistente">Asistente</option>
              <option value="administrador">Administrador</option>
            </select>

            {updatingUserId === user.id && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
          </div>
        </div>
      ))}

      {users.length === 0 && (
        <p className="text-sm text-gray-500">
          No hay usuarios registrados para mostrar.
        </p>
      )}
    </div>
  )}
</TabsContent>
)}
          </div>
        </Tabs>
      </div>
    </div>
  );
}