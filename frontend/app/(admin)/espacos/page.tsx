"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { espacoService, Espaco, EspacoFormData } from "../../../lib/services/espacoService";
import { empresaService, Empresa } from "../../../lib/services/empresaService";
import { Eye, Pencil, Trash2, DoorOpen, Users, Building2, RefreshCw } from "lucide-react";

interface EspacosPageProps {
  onOpenSidebar?: () => void;
}

export default function EspacosPage({ onOpenSidebar }: EspacosPageProps) {
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEspaco, setEditingEspaco] = useState<Espaco | null>(null);
  const [formData, setFormData] = useState<EspacoFormData>({
    nome: "",
    descricao: "",
    capacidade: 10,
    empresaId: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [detailsEspaco, setDetailsEspaco] = useState<Espaco | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [espacosData, empresasData] = await Promise.all([
        espacoService.getAll(),
        empresaService.getAll(),
      ]);
      setEspacos(espacosData);
      setEmpresas(empresasData);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar dados dos espaços.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEmpresaNome = (id: number) => {
    const emp = empresas.find((e) => e.id === id);
    return emp ? emp.nome : `Empresa #${id}`;
  };

  const handleOpenCreate = () => {
    setEditingEspaco(null);
    setFormData({
      nome: "",
      descricao: "",
      capacidade: 10,
      empresaId: empresas.length > 0 ? empresas[0].id : 0,
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (espaco: Espaco) => {
    setEditingEspaco(espaco);
    setFormData({
      nome: espaco.nome,
      descricao: espaco.descricao,
      capacidade: espaco.capacidade,
      empresaId: espaco.empresaId,
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.descricao.trim()) {
      setFeedback({ type: "error", message: "Nome e descrição são obrigatórios." });
      return;
    }
    if (!formData.empresaId || formData.empresaId <= 0) {
      setFeedback({ type: "error", message: "Selecione a empresa associada ao espaço." });
      return;
    }
    if (formData.capacidade <= 0) {
      setFeedback({ type: "error", message: "A capacidade deve ser de pelo menos 1 pessoa." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingEspaco) {
        await espacoService.update(editingEspaco.id, {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          capacidade: Number(formData.capacidade),
          empresaId: Number(formData.empresaId),
        });
        setFeedback({ type: "success", message: "Espaço atualizado com sucesso!" });
      } else {
        await espacoService.create({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          capacidade: Number(formData.capacidade),
          empresaId: Number(formData.empresaId),
        });
        setFeedback({ type: "success", message: "Espaço cadastrado com sucesso!" });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar espaço.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      await espacoService.delete(deletingId);
      setFeedback({ type: "success", message: "Espaço excluído com sucesso!" });
      setDeletingId(null);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir espaço.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Espaco>[] = [
    {
      header: "ID",
      cell: (e) => <span className="font-mono text-xs font-bold text-slate-500">#{e.id}</span>,
      className: "w-16",
    },
    {
      header: "Nome do Espaço",
      cell: (e) => (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-semibold text-xs shrink-0">
            <DoorOpen size={16} />
          </div>
          <div>
            <span className="font-semibold text-slate-800 block">{e.nome}</span>
            <span className="text-xs text-slate-400 line-clamp-1">{e.descricao}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Empresa Associada",
      cell: (e) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
          <Building2 size={13} className="text-slate-500" />
          <span>{getEmpresaNome(e.empresaId)}</span>
        </div>
      ),
    },
    {
      header: "Capacidade",
      cell: (e) => (
        <div className="flex items-center gap-1 text-slate-700 text-xs font-medium">
          <Users size={14} className="text-slate-400" />
          <span>{e.capacidade} pessoa(s)</span>
        </div>
      ),
    },
    {
      header: "Ações",
      className: "text-right w-36",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setDetailsEspaco(e)}
            title="Visualizar detalhes"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(e)}
            title="Editar registro"
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeletingId(e.id)}
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
        title="Gestão de Espaços"
        subtitle="Salas, auditórios e ambientes disponíveis para reserva"
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
          data={espacos}
          isLoading={isLoading}
          searchPlaceholder="Buscar por nome, descrição ou empresa..."
          searchFilter={(e, q) =>
            e.nome.toLowerCase().includes(q) ||
            e.descricao.toLowerCase().includes(q) ||
            getEmpresaNome(e.empresaId).toLowerCase().includes(q)
          }
          onAdd={handleOpenCreate}
          addButtonLabel="Novo Espaço"
          emptyMessage="Nenhum espaço cadastrado."
        />

        {/* Modal Formulário (Criar / Editar) */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingEspaco ? `Editar Espaço #${editingEspaco.id}` : "Cadastrar Novo Espaço"}
          subtitle="Preencha as informações do espaço físico"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome do Espaço *
              </label>
              <div className="relative">
                <DoorOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Sala de Reuniões Alpha"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição do Espaço *
              </label>
              <textarea
                required
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Sala equipada com projetor, ar-condicionado e quadro branco."
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Capacidade (Pessoas) *
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.capacidade}
                    onChange={(e) => setFormData({ ...formData, capacidade: Number(e.target.value) })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Empresa Proprietária *
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.empresaId}
                    onChange={(e) => setFormData({ ...formData, empresaId: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  >
                    {empresas.length === 0 ? (
                      <option value={0}>Nenhuma empresa cadastrada</option>
                    ) : (
                      empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome} (ID: #{emp.id})
                        </option>
                      ))
                    )}
                  </select>
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
                disabled={isSubmitting || empresas.length === 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : editingEspaco ? "Salvar Alterações" : "Cadastrar Espaço"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Detalhes */}
        <Modal
          isOpen={!!detailsEspaco}
          onClose={() => setDetailsEspaco(null)}
          title="Detalhes do Espaço"
          subtitle={`Informações completas do registro #${detailsEspaco?.id}`}
        >
          {detailsEspaco && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg">
                  <DoorOpen size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{detailsEspaco.nome}</h4>
                  <p className="text-xs text-slate-500">ID do Espaço: #{detailsEspaco.id}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <span className="text-xs text-slate-400 font-medium block mb-1">Descrição</span>
                <p className="text-slate-700">{detailsEspaco.descricao}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Empresa Associada</span>
                  <span className="font-semibold text-slate-700">{getEmpresaNome(detailsEspaco.empresaId)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Capacidade Máxima</span>
                  <span className="font-semibold text-slate-700">{detailsEspaco.capacidade} pessoas</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const esp = detailsEspaco;
                    setDetailsEspaco(null);
                    handleOpenEdit(esp);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsEspaco(null)}
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
          message="Tem certeza que deseja excluir este espaço? Todas as disponibilidades e reservas associadas podem ser afetadas."
        />
      </main>
    </>
  );
}

