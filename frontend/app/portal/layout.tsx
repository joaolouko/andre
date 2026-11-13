"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, DoorOpen, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/authContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token) router.replace("/login");
    else if (!isLoading && user && user.role !== "CLIENT") router.replace("/dashboard");
  }, [isLoading, token, user, router]);

  if (isLoading || !token || user?.role !== "CLIENT") {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  const activeClass = "rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700";
  const idleClass = "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50";
  return <div className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/portal" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">G</span>
          <span><strong className="block text-sm text-slate-900">Gestão de Espaços</strong><span className="text-xs text-slate-500">Portal do solicitante</span></span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/portal" className={pathname === "/portal" ? activeClass : idleClass}><span className="inline-flex items-center gap-2"><DoorOpen size={16} /> Reservar espaço</span></Link>
          <Link href="/portal/historico" className={pathname.startsWith("/portal/historico") ? activeClass : idleClass}><span className="inline-flex items-center gap-2"><CalendarDays size={16} /> Minhas reservas</span></Link>
        </nav>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <span className="hidden text-right sm:block"><strong className="block max-w-36 truncate text-xs text-slate-800">{user.name}</strong><span className="text-[11px] text-slate-500">Solicitante</span></span>
          <button onClick={() => void logout()} aria-label="Sair da conta" title="Sair" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut size={17} /></button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
  </div>;
}
