"use client";

import { useState } from "react";
import { Stethoscope, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const MAX_FAILED_ATTEMPTS = 3;
  const LOCK_TIME_MINUTES = 5;

  const getUserProfileByEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const usersRef = collection(db, "usuarios");
    const userSnapshot = await getDocs(usersRef);

    const userDoc = userSnapshot.docs.find((docSnap) => {
      const userEmail = docSnap.data().email;

      return (
        typeof userEmail === "string" &&
        userEmail.trim().toLowerCase() === normalizedEmail
      );
    });

    if (!userDoc) return null;

    return {
      id: userDoc.id,
      ref: userDoc.ref,
      data: userDoc.data(),
    };
  };

  const registrarEventoAuditoria = async (
  email: string,
  evento: string,
  estado: string,
  detalle: string
) => {
  try {
    await addDoc(collection(db, "auditorias"), {
      email,
      evento,
      estado,
      detalle,
      fecha: new Date(),
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
};

  const handlePasswordReset = async () => {
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({
        title: "Correo requerido",
        description: "Ingrese su correo electrónico para recuperar la contraseña.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);

      toast({
        title: "Correo enviado",
        description: "Revise su bandeja de entrada para restablecer la contraseña.",
      });
    } catch (error) {
      toast({
        title: "No se pudo enviar el correo",
        description:
          "Verifique que el correo ingresado sea correcto e intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedEmail || !formData.password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingrese correo y contraseña.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const profile = await getUserProfileByEmail(normalizedEmail);

      if (profile) {
        const blockedUntil = profile.data.bloqueadoHasta;

        if (blockedUntil) {
          const blockDate = blockedUntil.toDate
            ? blockedUntil.toDate()
            : new Date(blockedUntil);

          if (blockDate > new Date()) {
            toast({
              title: "Cuenta bloqueada",
              description:
                "Demasiados intentos fallidos. Intente nuevamente más tarde.",
              variant: "destructive",
            });

            setLoading(false);
            return;
          }
        }
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        formData.password
      );

      const firebaseUser = userCredential.user;
      const userRef = doc(db, "usuarios", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast({
          title: "Usuario no encontrado",
          description: "No existe un perfil asociado a esta cuenta.",
          variant: "destructive",
        });

        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      if (userData.activo === false) {
        toast({
          title: "Cuenta desactivada",
          description: "Contacte al administrador del sistema.",
          variant: "destructive",
        });

        setLoading(false);
        return;
      }

      await updateDoc(userRef, {
        ultimoAcceso: new Date(),
        intentosFallidos: 0,
        bloqueadoHasta: null,
      });

      await registrarEventoAuditoria(
  normalizedEmail,
  "LOGIN",
  "EXITOSO",
  "Inicio de sesión exitoso"
);

      toast({
        title: "Bienvenido",
        description: "Inicio de sesión exitoso.",
      });

      router.push("/");
    } catch (error) {
      const profile = await getUserProfileByEmail(normalizedEmail);

      if (profile) {
        const currentAttempts = profile.data.intentosFallidos ?? 0;
        const newAttempts = currentAttempts + 1;

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const blockedUntil = new Date();
          blockedUntil.setMinutes(blockedUntil.getMinutes() + LOCK_TIME_MINUTES);

          await updateDoc(profile.ref, {
            intentosFallidos: newAttempts,
            bloqueadoHasta: blockedUntil,
          });

          await registrarEventoAuditoria(
  normalizedEmail,
  "LOGIN",
  "BLOQUEADO",
  "Cuenta bloqueada temporalmente por múltiples intentos fallidos"
);

          toast({
            title: "Cuenta bloqueada",
            description:
              "Demasiados intentos fallidos. La cuenta fue bloqueada temporalmente por 5 minutos.",
            variant: "destructive",
          });

          return;
        }

        await updateDoc(profile.ref, {
          intentosFallidos: newAttempts,
        });
      }

      await registrarEventoAuditoria(
  normalizedEmail,
  "LOGIN",
  "FALLIDO",
  "Intento de inicio de sesión con credenciales incorrectas"
);

      toast({
        title: "Error",
        description: "Correo o contraseña incorrectos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EBF4FF] to-white p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mx-auto mb-6">
            <Stethoscope className="text-white w-9 h-9" />
          </div>
          <h1 className="text-4xl font-headline font-extrabold text-[#1A2B3C] tracking-tight">
            Medi Notes
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Gestión Clínica Inteligente
          </p>
        </div>

        <div className="card-notion p-8 shadow-2xl shadow-blue-900/5">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="email"
                  placeholder="doctor@medinotes.com"
                  className="pl-10 h-12 rounded-lg border-gray-200 focus:ring-primary"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {resetLoading ? "Enviando..." : "¿Olvidó su contraseña?"}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-lg border-gray-200 focus:ring-primary"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-all duration-300 transform active:scale-[0.98]"
            >
              {loading ? "Verificando..." : "Ingresar al Panel"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/signup")}
              className="w-full h-12 rounded-lg font-bold"
            >
              Crear cuenta
            </Button>
          </form>
        </div>

        <p className="text-center mt-8 text-gray-400 text-xs">
          &copy; {new Date().getFullYear()} Medi Notes App. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  );
}