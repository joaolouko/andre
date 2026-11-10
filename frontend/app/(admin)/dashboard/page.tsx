"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "../../../components/Header";
import StatCard from "../../../components/StatCard";
import {
  Users,
  Building2,
  DoorOpen,
  CalendarCheck,
  CalendarDays,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { dashboardService, DashboardStats } from "../../../lib/services/dashboardService";
import { usuarioService, Usuario } from "../../../lib/services/usuarioService";
import { espacoService, Espaco } from "../../../lib/services/espacoService";
import Link from "next/link";
import Alert from "../../../components/Alert";

interface DashboardPageProps {
  onOpenSidebar?: () => void;
}

export default function DashboardPage({ onOpenSidebar }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [statsData, usuariosData, espacosData] = await Promise.all([
        dashboardService.getStats(),
        usuarioService.getAll(),
        espacoService.getAll(),
      ]);
      setStats(statsData);
      setUsuarios(usuariosData);
      setEspacos(espacosData);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados do painel."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUsuarioNome = (id: number) => {
    const user = usuarios.find((u) => u.id === id);
    return user ? user.nome : `Usuário #${id}`;
  };

  const getEspacoNome = (id: number) => {
    const espaco = espacos.find((e) => e.id === id);
    return espaco ? espaco.nome : `Espaço #${id}`;
  };

  return (
    <>
      <Header
        title="Visão Geral do Sistema"
        subtitle="Métricas e indicadores consolidados em tempo real via API"
        onOpenSidebar={onOpenSidebar || (() => {})}
        actions={
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Atualizar dados"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
          </button>
        }
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        {/* Indicadores / Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Usuários"
            value={isLoading ? "..." : stats?.usuarios ?? 0}
            icon={Users}
            href="/usuarios"
            color="blue"
            description="Cadastros ativos"
          />
          <StatCard
            title="Empresas"
            value={isLoading ? "..." : stats?.empresas ?? 0}
            icon={Building2}
            href="/empresas"
            color="indigo"
            description="Organizações"
          />
          <StatCard
            title="Espaços"
            value={isLoading ? "..." : stats?.espacos ?? 0}
            icon={DoorOpen}
            href="/espacos"
            color="emerald"
            description="Salas e auditórios"
          />
          <StatCard
            title="Disponibilidades"
            value={isLoading ? "..." : stats?.disponibilidades ?? 0}
            icon={CalendarCheck}
            href="/disponibilidades"
            color="purple"
            description="Horários livres"
          />
          <StatCard
            title="Reservas"
            value={isLoading ? "..." : stats?.reservas ?? 0}
            icon={CalendarDays}
            href="/reservas"
            color="amber"
            description="Agendamentos"
          />
        </div>

        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Ações Rápidas de Cadastro
            </h3>
            <p className="text-xs text-slate-500">
              Acesse rapidamente os formulários de cadastro de cada entidade
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/usuarios"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span>Novo Usuário</span>
            </Link>
            <Link
              href="/empresas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span>Nova Empresa</span>
            </Link>
            <Link
              href="/espacos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span>Novo Espaço</span>
            </Link>
            <Link
              href="/disponibilidades"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span>Nova Disp.</span>
            </Link>
            <Link
              href="/reservas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>Nova Reserva</span>
            </Link>
          </div>
        </div>

        {/* Recent Reservations Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Últimas Reservas Registradas
              </h3>
              <p className="text-xs text-slate-500">
                Agendamentos recentes realizados no sistema
              </p>
            </div>
            <Link
              href="/reservas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Ver todas</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Espaço</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Horário</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">
                      Carregando reservas...
                    </td>
                  </tr>
                ) : !stats?.ultimasReservas || stats.ultimasReservas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">
                      Nenhuma reserva registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  stats.ultimasReservas.map((reserva) => {
                    const statusColors =
                      reserva.status === "confirmada"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : reserva.status === "cancelada"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={reserva.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-500">
                          #{reserva.id}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-800">
                          {getUsuarioNome(reserva.usuarioId)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {getEspacoNome(reserva.espacoId)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                          {reserva.data}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                          {reserva.horaInicio} - {reserva.horaFim}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors}`}
                          >
                            {reserva.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

