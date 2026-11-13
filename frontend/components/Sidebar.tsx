"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, DoorOpen, CalendarCheck, CalendarDays, CalendarRange, Wrench, FileCode2, LogOut, X } from "lucide-react";
import { useAuth } from "../lib/authContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", href: "/agenda", icon: CalendarRange },
  { name: "Reservas", href: "/reservas", icon: CalendarDays },
  { name: "Disponibilidades", href: "/disponibilidades", icon: CalendarCheck },
  { name: "Manutenção e eventos", href: "/bloqueios", icon: Wrench },
  { name: "Espaços", href: "/espacos", icon: DoorOpen },
  { name: "Empresas", href: "/empresas", icon: Building2 },
  { name: "Usuários", href: "/usuarios", icon: Users, adminOnly: true },
];

interface SidebarProps { isOpen: boolean; onClose: () => void }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === "ADMIN");
  const roleName = user?.role === "ADMIN" ? "Administrador" : "Recepção";
  return <>
    {isOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden" onClick={onClose} />}
    <aside className={`fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6"><Link href="/dashboard" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white shadow-sm">G</span><span className="flex flex-col"><strong className="text-sm leading-tight text-slate-800">Gestão de Espaços</strong><span className="text-[11px] font-medium text-slate-400">Painel de operação</span></span></Link><button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600 lg:hidden" aria-label="Fechar menu"><X size={20} /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4"><div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operação</div>{visibleItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname?.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} onClick={onClose} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-blue-50 font-semibold text-blue-700 shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={19} className={active ? "text-blue-600" : "text-slate-400"} /><span>{item.name}</span></Link>; })}<div className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recursos da API</div><a href={`${apiUrl}/api-docs`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"><FileCode2 size={19} className="text-emerald-500" /><span>Swagger API Docs</span></a></nav>
      <div className="border-t border-slate-100 bg-slate-50/50 p-3"><div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2 shadow-2xs"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</span><div className="truncate"><p className="truncate text-xs font-semibold text-slate-800">{user?.name || "Usuário"}</p><p className="truncate text-[11px] text-slate-400">{roleName}</p></div></div><button onClick={() => void logout()} title="Encerrar sessão" aria-label="Encerrar sessão" className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><LogOut size={16} /></button></div></div>
    </aside>
  </>;
}
