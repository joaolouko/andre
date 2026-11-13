"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import Sidebar from "../../components/Sidebar";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    } else if (!isLoading && user?.role === "CLIENT") {
      router.replace("/portal");
    } else if (!isLoading && user?.role === "RECEPTION" && pathname?.startsWith("/usuarios")) {
      router.replace("/reservas");
    }
  }, [token, user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm text-slate-500 font-medium mt-3">
          Carregando sessão...
        </span>
      </div>
    );
  }

  if (!token || user?.role === "CLIENT" || (user?.role === "RECEPTION" && pathname?.startsWith("/usuarios"))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {React.cloneElement(children as React.ReactElement<{ onOpenSidebar?: () => void }>, {
          onOpenSidebar: () => setSidebarOpen(true),
        })}
      </div>
    </div>
  );
}
