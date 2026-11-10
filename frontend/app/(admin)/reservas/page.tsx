"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { reservaService, Reserva, ReservaFormData } from "../../../lib/services/reservaService";
import { usuarioService, Usuario } from "../../../lib/services/usuarioService";
import { espacoService, Espaco } from "../../../lib/services/espacoService";
import { disponibilidadeService, Disponibilidade } from "../../../lib/services/disponibilidadeService";
import {
  Eye,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  Calendar,
  DoorOpen,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface ReservasPageProps {
  onOpenSidebar?: () => void;
}

export default function ReservasPage({ onOpenSidebar }: ReservasPageProps) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [formData, setFormData] = useState<ReservaFormData>({
    usuarioId: 0,
    espacoId: 0,
    data: new Date().toISOString().split("T")[0],
    horaInicio: "10:00",
    horaFim: "12:00",
    status: "confirmada",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [detailsReserva, setDetailsReserva] = useState<Reserva | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reservasData, usuariosData, espacosData, dispData] = await Promise.all([
        reservaService.getAll(),
        usuarioService.getAll(),
        espacoService.getAll(),
        disponibilidadeService.getAll(),
      ]);
      setReservas(reservasData);
      setUsuarios(usuariosData);
      setEspacos(espacosData);
      setDisponibilidades(dispData);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar reservas.",
      });
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

  const handleOpenCreate = () => {
    setEditingReserva(null);
    setFormData({
      usuarioId: usuarios.length > 0 ? usuarios[0].id : 0,
      espacoId: espacos.length > 0 ? espacos[0].id : 0,
      data: new Date().toISOString().split("T")[0],
      horaInicio: "10:00",
      horaFim: "12:00",
      status: "confirmada",
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (reserva: Reserva) => {
    setEditingReserva(reserva);
    setFormData({
      usuarioId: reserva.usuarioId,
      espacoId: reserva.espacoId,
      data: reserva.data,
      horaInicio: reserva.horaInicio,
      horaFim: reserva.horaFim,
      status: reserva.status || "confirmada",
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim() || !formData.horaInicio.trim() || !formData.horaFim.trim()) {
      setFeedback({ type: "error", message: "Data e horários são obrigatórios." });
      return;
    }
    if (!formData.usuarioId || formData.usuarioId <= 0) {
      setFeedback({ type: "error", message: "Selecione o usuário responsável pela reserva." });
      return;
    }
    if (!formData.espacoId || formData.espacoId <= 0) {
      setFeedback({ type: "error", message: "Selecione o espaço a ser reservado." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingReserva) {
        await reservaService.update(editingReserva.id, {
          usuarioId: Number(formData.usuarioId),
          espacoId: Number(formData.espacoId),
          data: formData.data.trim(),
          horaInicio: formData.horaInicio.trim(),
          horaFim: formData.horaFim.trim(),
          status: formData.status,
        });
        setFeedback({ type: "success", message: "Reserva atualizada com sucesso!" });
      } else {
        await reservaService.create({
          usuarioId: Number(formData.usuarioId),
          espacoId: Number(formData.espacoId),
          data: formData.data.trim(),
          horaInicio: formData.horaInicio.trim(),
          horaFim: formData.horaFim.trim(),
          status: formData.status || "confirmada",
        });
        setFeedback({ type: "success", message: "Reserva cadastrada com sucesso!" });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar reserva.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      await reservaService.delete(deletingId);
      setFeedback({ type: "success", message: "Reserva excluída com sucesso!" });
      setDeletingId(null);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir reserva.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || "confirmada").toLowerCase();
    if (s === "confirmada") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          <span>Confirmada</span>
        </span>
      );
    }
    if (s === "cancelada") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <XCircle size={12} />
          <span>Cancelada</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle size={12} />
        <span>Pendente</span>
      </span>
    );
  };

  const columns: Column<Reserva>[] = [
    {
      header: "ID",
      cell: (r) => <span className="font-mono text-xs font-bold text-slate-500">#{r.id}</span>,
      className: "w-16",
    },
    {
      header: "Usuário Solicitante",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs shrink-0">
            <User size={14} />
          </div>
          <span className="font-semibold text-slate-800">{getUsuarioNome(r.usuarioId)}</span>
        </div>
      ),
    },
    {
      header: "Espaço Reservado",
      cell: (r) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <DoorOpen size={15} className="text-slate-400" />
          <span>{getEspacoNome(r.espacoId)}</span>
        </div>
      ),
    },
    {
      header: "Data",
      cell: (r) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
          <Calendar size={14} className="text-slate-400" />
          <span>{r.data}</span>
        </div>
      ),
    },
    {
      header: "Horário",
      cell: (r) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
          <Clock size={14} className="text-slate-400" />
          <span>{r.horaInicio} - {r.horaFim}</span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => renderStatusBadge(r.status),
    },
    {
      header: "Ações",
      className: "text-right w-36",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setDetailsReserva(r)}
            title="Visualizar detalhes"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(r)}
            title="Editar registro"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeletingId(r.id)}
            title="Excluir registro"
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header
        title="Gestão de Reservas"
        subtitle="Agendamentos de espaços físicos associados a usuários e horários"
        onOpenSidebar={onOpenSidebar || (() => {})}
        actions={
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Atualizar lista"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
          </button>
        }
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-5">
        {feedback && (
          <Alert
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        )}

        <DataTable
          columns={columns}
          data={reservas}
          isLoading={isLoading}
          searchPlaceholder="Buscar por usuário, espaço, data ou status..."
          searchFilter={(r, q) =>
            getUsuarioNome(r.usuarioId).toLowerCase().includes(q) ||
            getEspacoNome(r.espacoId).toLowerCase().includes(q) ||
            r.data.toLowerCase().includes(q) ||
            (r.status || "").toLowerCase().includes(q)
          }
          onAdd={handleOpenCreate}
          addButtonLabel="Nova Reserva"
          emptyMessage="Nenhuma reserva cadastrada."
        />

        {/* Modal Formulário (Criar / Editar) */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingReserva ? `Editar Reserva #${editingReserva.id}` : "Cadastrar Nova Reserva"}
          subtitle="Selecione o usuário, espaço e horário desejados"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuário Solicitante *
              </label>
              <select
                required
                value={formData.usuarioId}
                onChange={(e) => setFormData({ ...formData, usuarioId: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {usuarios.length === 0 ? (
                  <option value={0}>Nenhum usuário cadastrado</option>
                ) : (
                  usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.email})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Espaço Físico *
              </label>
              <select
                required
                value={formData.espacoId}
                onChange={(e) => setFormData({ ...formData, espacoId: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                {espacos.length === 0 ? (
                  <option value={0}>Nenhum espaço cadastrado</option>
                ) : (
                  espacos.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nome} (Capacidade: {esp.capacidade})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Data da Reserva *
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Horário Início *
                </label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    required
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Horário Fim *
                </label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    required
                    value={formData.horaFim}
                    onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Status da Reserva *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              >
                <option value="confirmada">Confirmada</option>
                <option value="pendente">Pendente</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || usuarios.length === 0 || espacos.length === 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : editingReserva ? "Salvar Alterações" : "Cadastrar Reserva"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Detalhes */}
        <Modal
          isOpen={!!detailsReserva}
          onClose={() => setDetailsReserva(null)}
          title="Detalhes da Reserva"
          subtitle={`Informações completas do agendamento #${detailsReserva?.id}`}
        >
          {detailsReserva && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-600 text-white font-bold text-lg">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">
                      {getEspacoNome(detailsReserva.espacoId)}
                    </h4>
                    <p className="text-xs text-slate-500">Reserva #{detailsReserva.id}</p>
                  </div>
                </div>
                <div>{renderStatusBadge(detailsReserva.status)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Usuário Solicitante</span>
                  <span className="font-semibold text-slate-700">{getUsuarioNome(detailsReserva.usuarioId)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Espaço</span>
                  <span className="font-semibold text-slate-700">{getEspacoNome(detailsReserva.espacoId)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Data Agendada</span>
                  <span className="font-semibold text-slate-700 font-mono">{detailsReserva.data}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Horário</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {detailsReserva.horaInicio} até {detailsReserva.horaFim}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const r = detailsReserva;
                    setDetailsReserva(null);
                    handleOpenEdit(r);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsReserva(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Confirmação de Exclusão */}
        <ConfirmDialog
          isOpen={deletingId !== null}
          onClose={() => setDeletingId(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          message="Tem certeza que deseja excluir esta reserva? O horário deixará de estar agendado."
        />
      </main>
    </>
  );
}

