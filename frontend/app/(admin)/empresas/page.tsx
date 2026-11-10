"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { empresaService, Empresa, EmpresaFormData } from "../../../lib/services/empresaService";
import { Eye, Pencil, Trash2, Mail, Phone, Building2, FileText, RefreshCw } from "lucide-react";

interface EmpresasPageProps {
  onOpenSidebar?: () => void;
}

export default function EmpresasPage({ onOpenSidebar }: EmpresasPageProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState<EmpresaFormData>({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [detailsEmpresa, setDetailsEmpresa] = useState<Empresa | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadEmpresas = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await empresaService.getAll();
      setEmpresas(data);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao carregar empresas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  const handleOpenCreate = () => {
    setEditingEmpresa(null);
    setFormData({ nome: "", cnpj: "", email: "", telefone: "" });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      email: empresa.email,
      telefone: empresa.telefone,
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cnpj.trim() || !formData.email.trim() || !formData.telefone.trim()) {
      setFeedback({ type: "error", message: "Por favor preencha todos os campos obrigatórios." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (editingEmpresa) {
        await empresaService.update(editingEmpresa.id, {
          nome: formData.nome.trim(),
          cnpj: formData.cnpj.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
        });
        setFeedback({ type: "success", message: "Empresa atualizada com sucesso!" });
      } else {
        await empresaService.create({
          nome: formData.nome.trim(),
          cnpj: formData.cnpj.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
        });
        setFeedback({ type: "success", message: "Empresa cadastrada com sucesso!" });
      }
      setIsFormOpen(false);
      await loadEmpresas();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao salvar empresa.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      await empresaService.delete(deletingId);
      setFeedback({ type: "success", message: "Empresa excluída com sucesso!" });
      setDeletingId(null);
      await loadEmpresas();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir empresa.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Empresa>[] = [
    {
      header: "ID",
      cell: (e) => <span className="font-mono text-xs font-bold text-slate-500">#{e.id}</span>,
      className: "w-16",
    },
    {
      header: "Razão Social / Nome",
      cell: (e) => (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-xs shrink-0">
            <Building2 size={16} />
          </div>
          <span className="font-semibold text-slate-800">{e.nome}</span>
        </div>
      ),
    },
    {
      header: "CNPJ",
      cell: (e) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
          <FileText size={14} className="text-slate-400" />
          <span>{e.cnpj}</span>
        </div>
      ),
    },
    {
      header: "E-mail",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Mail size={14} className="text-slate-400" />
          <span>{e.email}</span>
        </div>
      ),
    },
    {
      header: "Telefone",
      cell: (e) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Phone size={14} className="text-slate-400" />
          <span>{e.telefone}</span>
        </div>
      ),
    },
    {
      header: "Ações",
      className: "text-right w-36",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setDetailsEmpresa(e)}
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
        title="Gestão de Empresas"
        subtitle="Organizações e empresas proprietárias dos espaços físicos"
        onOpenSidebar={onOpenSidebar || (() => { })}
        actions={
          <button
            onClick={loadEmpresas}
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
          data={empresas}
          isLoading={isLoading}
          searchPlaceholder="Buscar por nome, CNPJ ou e-mail..."
          searchFilter={(e, q) =>
            e.nome.toLowerCase().includes(q) ||
            e.cnpj.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q)
          }
          onAdd={handleOpenCreate}
          addButtonLabel="Nova Empresa"
          emptyMessage="Nenhuma empresa cadastrada."
        />

        {/* Modal Formulário (Criar / Editar) */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingEmpresa ? `Editar Empresa #${editingEmpresa.id}` : "Cadastrar Nova Empresa"}
          subtitle="Preencha os dados cadastrais da empresa"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome / Razão Social *
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Empresa XYZ Ltda"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                CNPJ *
              </label>
              <div className="relative">
                <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="12.345.678/0001-90"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefone de Contato *
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="4833333333"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
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
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Salvando..." : editingEmpresa ? "Salvar Alterações" : "Cadastrar Empresa"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Detalhes */}
        <Modal
          isOpen={!!detailsEmpresa}
          onClose={() => setDetailsEmpresa(null)}
          title="Detalhes da Empresa"
          subtitle={`Informações completas do registro #${detailsEmpresa?.id}`}
        >
          {detailsEmpresa && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg">
                  <Building2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{detailsEmpresa.nome}</h4>
                  <p className="text-xs text-slate-500">ID da Empresa: #{detailsEmpresa.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">CNPJ</span>
                  <span className="font-semibold text-slate-700 font-mono text-xs">{detailsEmpresa.cnpj}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block mb-1">E-mail</span>
                  <span className="font-semibold text-slate-700">{detailsEmpresa.email}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Telefone</span>
                  <span className="font-semibold text-slate-700">{detailsEmpresa.telefone}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const emp = detailsEmpresa;
                    setDetailsEmpresa(null);
                    handleOpenEdit(emp);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Editar Dados
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsEmpresa(null)}
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
          message="Tem certeza que deseja excluir esta empresa? Esta ação removerá o registro permanentemente do banco de dados."
        />
      </main>
    </>
  );
}