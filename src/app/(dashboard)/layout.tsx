"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

const INACTIVITY_LIMIT = 5 * 60 * 1000;

const rolePermissions: Record<string, string[]> = {
  doctor: [
    "/inicio",
    "/pacientes",
    "/calendario",
    "/citas",
    "/formularios", // Añadido
    "/expedientes",
    "/reportes",
    "/asistente",
    "/configuracion",
  ],
  administrador: [
    "/inicio",
    "/pacientes",
    "/calendario",
    "/citas",
    "/formularios", // Añadido
    "/expedientes",
    "/reportes",
    "/asistente",
    "/configuracion",
  ],
  asistente: ["/inicio", "/pacientes", "/calendario", "/citas", "/formularios"], // Añadido
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingSession, setCheckingSession] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        const userData = userSnap.data();
        setUserRole(userData.rol ?? null);
      } catch (error) {
        console.error("Error obteniendo rol del usuario:", error);
        await signOut(auth);
        router.replace("/login");
        return;
      } finally {
        setCheckingSession(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (checkingSession || !userRole) return;

    const allowedRoutes = rolePermissions[userRole] ?? [];

    const hasAccess = allowedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    setAccessDenied(!hasAccess);
  }, [checkingSession, userRole, pathname]);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);

      inactivityTimer = setTimeout(async () => {
        await signOut(auth);
        router.replace("/login");
      }, INACTIVITY_LIMIT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm font-medium text-gray-500">
          Verificando sesión...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userRole={userRole} />
      <main className="flex-1 ml-64 p-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {accessDenied ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Acceso denegado
                </h1>
                <p className="text-gray-500 mb-6">
                  Su rol no cuenta con permisos para acceder a esta sección.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/inicio")}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
                >
                  Volver al dashboard
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
