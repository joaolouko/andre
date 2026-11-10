"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { disponibilidadeService, Disponibilidade, DisponibilidadeFormData } from "../../../lib/services/disponibilidadeService";
import { espacoService, Espaco } from "../../../lib/services/espacoService";
import { Eye, Pencil, Trash2, CalendarCheck, Clock, Calendar, DoorOpen, RefreshCw } from "lucide-react";

interface DisponibilidadesPageProps {
  onOpenSidebar?: () => void;
}

export default function DisponibilidadesPage({ onOpenSidebar }: DisponibilidadesPageProps) {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDisp, setEditingDisp] = useState<Disponibilidade | null>(null);
  const [formData, setFormData] = useState<DisponibilidadeFormData>({
    espacoId: 0,
    data: new Date().toISOString().split("T")[0],
    horaInicio: "08:00",
    horaFim: "18:00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [detailsDisp, setDetailsDisp] = useState<Disponibilidade | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dispData, espacosData] = await Promise.all([
        disponibilidadeService.getAll(),
        espacoService.getAll(),
      ]);
      setDisponibilidades(dispData);
      setEspacos(espacosData);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar disponibilidades.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEspacoNome = (id: number) => {
    const espaco = espacos.find((e) => e.id === id);
    return espaco ? espaco.nome : `Espaço #${id}`;
  };

  const handleOpenCreate = () => {
    setEditingDisp(null);
    setFormData({
      espacoId: espacos.length > 0 ? espacos[0].id : 0,
      data: new Date().toISOString().split("T")[0],
      horaInicio: "08:00",
      horaFim: "18:00",
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (disp: Disponibilidade) => {
    setEditingDisp(disp);
    setFormData({
      espacoId: disp.espacoId,
      data: disp.data,
      horaInicio: disp.horaInicio,
      horaFim: disp.horaFim,
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
    if (!formData.espacoId || formData.espacoId <= 0) {
      setFeedback({ type: "error", message: "Selecione o espaço associado." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingDisp) {
        await disponibilidadeService.update(editingDisp.id, {
          espacoId: Number(formData.espacoId),
          data: formData.data.trim(),
          horaInicio: formData.horaInicio.trim(),
          horaFim: formData.horaFim.trim(),
        });
        setFeedback({ type: "success", message: "Disponibilidade atualizada com sucesso!" });
      } else {
        await disponibilidadeService.create({
          espacoId: Number(formData.espacoId),
          data: formData.data.trim(),
          horaInicio: formData.horaInicio.trim(),
          horaFim: formData.horaFim.trim(),
        });
        setFeedback({ type: "success", message: "Disponibilidade cadastrada com sucesso!" });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar disponibilidade.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      await disponibilidadeService.delete(deletingId);
      setFeedback({ type: "success", message: "Disponibilidade excluída com sucesso!" });
      setDeletingId(null);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir disponibilidade.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Disponibilidade>[] = [
    {
      header: "ID",
      cell: (d) => <span className="font-mono text-xs font-bold text-slate-500">#{d.id}</span>,
      className: "w-16",
    },
    {
      header: "Espaço Físico",
      cell: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-semibold text-xs shrink-0">
            <DoorOpen size={16} />
          </div>
          <span className="font-semibold text-slate-800">{getEspacoNome(d.espacoId)}</span>
        </div>
      ),
    },
    {
      header: "Data Disponível",
      cell: (d) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
          <Calendar size={14} className="text-slate-400" />
          <span>{d.data}</span>
        </div>
      ),
    },
    {
      header: "Janela de Horário",
      cell: (d) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
          <Clock size={14} className="text-slate-400" />
          <span>{d.horaInicio} até {d.horaFim}</span>
        </div>
      ),
    },
    {
      header: "Ações",
      className: "text-right w-36",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setDetailsDisp(d)}
            title="Visualizar detalhes"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(d)}
            title="Editar registro"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeletingId(d.id)}
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
        title="Gestão de Disponibilidades"
        subtitle="Janelas de horários e datas livres para reserva nos espaços"
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
          data={disponibilidades}
          isLoading={isLoading}
          searchPlaceholder="Buscar por espaço ou data (AAAA-MM-DD)..."
          searchFilter={(d, q) =>
            d.data.toLowerCase().includes(q) ||
            getEspacoNome(d.espacoId).toLowerCase().includes(q) ||
            d.horaInicio.includes(q) ||
            d.horaFim.includes(q)
          }
          onAdd={handleOpenCreate}
          addButtonLabel="Nova Disponibilidade"
          emptyMessage="Nenhuma disponibilidade cadastrada."
        />

        {/* Modal Formulário (Criar / Editar) */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingDisp ? `Editar Disponibilidade #${editingDisp.id}` : "Cadastrar Nova Disponibilidade"}
          subtitle="Defina o espaço e o intervalo de horários livres"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
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
                Data *
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
                disabled={isSubmitting || espacos.length === 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : editingDisp ? "Salvar Alterações" : "Cadastrar Disponibilidade"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Detalhes */}
        <Modal
          isOpen={!!detailsDisp}
          onClose={() => setDetailsDisp(null)}
          title="Detalhes da Disponibilidade"
          subtitle={`Informações completas do registro #${detailsDisp?.id}`}
        >
          {detailsDisp && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600 text-white font-bold text-lg">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{getEspacoNome(detailsDisp.espacoId)}</h4>
                  <p className="text-xs text-slate-500">ID da Disponibilidade: #{detailsDisp.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Data</span>
                  <span className="font-semibold text-slate-700 font-mono">{detailsDisp.data}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Janela de Horários</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {detailsDisp.horaInicio} até {detailsDisp.horaFim}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const d = detailsDisp;
                    setDetailsDisp(null);
                    handleOpenEdit(d);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsDisp(null)}
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
          message="Tem certeza que deseja excluir esta disponibilidade? Esta ação removerá a janela de horário cadastrada."
        />
      </main>
    </>
  );
}

