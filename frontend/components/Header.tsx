"use client";

import React from "react";
import { Menu, ExternalLink, LogOut } from "lucide-react";
import { useAuth } from "../lib/authContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenSidebar: () => void;
  actions?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  onOpenSidebar,
  actions,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        <a
          href={`${apiUrl}/api-docs`}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver documentação Swagger da API"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <span>Swagger Docs</span>
          <ExternalLink size={13} />
        </a>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-700">
              {user?.nome || "Admin"}
            </span>
            <span className="text-[11px] text-slate-400">
              {user?.email || ""}
            </span>
          </div>
          <button
            onClick={() => logout()}
            title="Sair"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}

