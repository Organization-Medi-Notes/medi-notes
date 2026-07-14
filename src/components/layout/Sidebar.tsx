"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/inicio",
    roles: ["doctor", "administrador", "asistente"],
  },
  {
    icon: Users,
    label: "Pacientes",
    href: "/pacientes",
    roles: ["doctor", "administrador", "asistente"],
  },
  {
    icon: Calendar,
    label: "Calendario",
    href: "/calendario",
    roles: ["doctor", "administrador", "asistente"],
  },
  {
    icon: ClipboardList,
    label: "Citas",
    href: "/citas",
    roles: ["doctor", "administrador", "asistente"],
  },
  {
    icon: FileText,
    label: "Formularios",
    href: "/formularios",
    roles: ["doctor", "administrador", "asistente"],
  },
  {
    icon: FileText,
    label: "Expedientes",
    href: "/expedientes",
    roles: ["doctor", "administrador"],
  },
  {
    icon: BarChart3,
    label: "Reportes",
    href: "/reportes",
    roles: ["doctor", "administrador"],
  },
 
  {
    icon: Settings,
    label: "Configuración",
    href: "/configuracion",
    roles: ["doctor", "administrador"],
  },
];

type SidebarProps = {
  userRole: string | null;
  enabledModules?: Record<string, boolean>;
};

export function Sidebar({
  userRole,
  enabledModules = {},
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const visibleMenuItems = menuItems.filter((item) => {
    const allowedByRole = item.roles.includes(userRole ?? "");
    const alwaysVisible = item.href === "/configuracion";
    const enabledByPreference =
      alwaysVisible || enabledModules[item.href] !== false;

    return allowedByRole && enabledByPreference;
  });

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-sidebar-background flex flex-col h-full z-50">
      <div className="p-6 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
          <Stethoscope className="text-white w-6 h-6" />
        </div>

        <span className="text-xl font-headline font-bold text-white tracking-tight">
          Medi Notes
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive
                    ? "text-white"
                    : "text-sidebar-foreground group-hover:text-white"
                )}
              />

              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-hover bg-[#152331]">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-hover transition-colors">
          <Avatar className="h-9 w-9 border border-sidebar-hover">
            <AvatarImage src="https://picsum.photos/seed/doc/100/100" />

            <AvatarFallback className="bg-primary text-white text-xs">
              DR
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              Medi Notes
            </p>

            <p className="text-[10px] text-sidebar-foreground truncate uppercase tracking-widest">
              {userRole ?? "Sin rol"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sidebar-foreground hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}