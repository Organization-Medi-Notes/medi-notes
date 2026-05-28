"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/lib/firebase/config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingSession(false);
    });

    return () => unsubscribe();
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
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
