"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { empresaService, Empresa, EmpresaFormData } from "../../../lib/services/empresaService";
import { MaskedInput } from "../../../components/MaskedInput";
import { digitsOnly, formatCnpj, formatPhone } from "../../../lib/inputMasks";
import { Eye, Pencil, Trash2, Mail, Phone, Building2, FileText, RefreshCw } from "lucide-react";

interface EmpresasPageProps { onOpenSidebar?: () => void }
const inputClass = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800";
const emptyForm = (): EmpresaFormData => ({ corporate_name: "", trade_name: "", cnpj: "", phone: "", email: "" });

export default function EmpresasPage({ onOpenSidebar }: EmpresasPageProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState<EmpresaFormData>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsEmpresa, setDetailsEmpresa] = useState<Empresa | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const loadEmpresas = useCallback(async () => { setIsLoading(true); try { setEmpresas(await empresaService.getAll()); } catch (err: unknown) { setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao carregar empresas." }); } finally { setIsLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void loadEmpresas(); }, 0); return () => window.clearTimeout(timer); }, [loadEmpresas]);
  const openCreate = () => { setEditingEmpresa(null); setFormData(emptyForm()); setFeedback(null); setIsFormOpen(true); };
  const openEdit = (e: Empresa) => { setEditingEmpresa(e); setFormData({ corporate_name: e.corporate_name, trade_name: e.trade_name ?? "", cnpj: formatCnpj(e.cnpj), phone: formatPhone(e.phone), email: e.email ?? "" }); setFeedback(null); setIsFormOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.corporate_name.trim() || !formData.cnpj.trim() || !formData.phone.trim()) { setFeedback({ type: "error", message: "Razão social, CNPJ e telefone são obrigatórios." }); return; }
    setIsSubmitting(true); setFeedback(null);
    const payload: EmpresaFormData = { corporate_name: formData.corporate_name.trim(), trade_name: formData.trade_name?.trim() || null, cnpj: digitsOnly(formData.cnpj), phone: digitsOnly(formData.phone), ...(formData.email?.trim() ? { email: formData.email.trim() } : {}) };
    try { if (editingEmpresa) { await empresaService.update(editingEmpresa.id, payload); setFeedback({ type: "success", message: "Empresa atualizada com sucesso!" }); } else { await empresaService.create(payload); setFeedback({ type: "success", message: "Empresa cadastrada com sucesso!" }); } setIsFormOpen(false); await loadEmpresas(); }
    catch (err: unknown) { setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar empresa." }); } finally { setIsSubmitting(false); }
  };
  const remove = async () => { if (deletingId === null) return; setIsDeleting(true); try { await empresaService.delete(deletingId); setDeletingId(null); setFeedback({ type: "success", message: "Empresa excluída com sucesso!" }); await loadEmpresas(); } catch (err: unknown) { setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao excluir empresa." }); } finally { setIsDeleting(false); } };
  const columns: Column<Empresa>[] = [
    { header: "ID", className: "w-16", cell: (e) => <span className="font-mono text-xs text-slate-500">#{e.id}</span> },
    { header: "Razão Social / Nome Fantasia", cell: (e) => <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center"><Building2 size={16} /></div><div><span className="font-semibold text-slate-800 block">{e.corporate_name}</span><span className="text-xs text-slate-400">{e.trade_name || "—"}</span></div></div> },
    { header: "CNPJ", cell: (e) => <span className="inline-flex items-center gap-1.5 font-mono text-xs"><FileText size={14} className="text-slate-400" />{formatCnpj(e.cnpj)}</span> },
    { header: "E-mail", cell: (e) => <span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-slate-400" />{e.email || "—"}</span> },
    { header: "Telefone", cell: (e) => <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-slate-400" />{formatPhone(e.phone) || "—"}</span> },
    { header: "Ações", className: "text-right w-36", cell: (e) => <div className="flex justify-end gap-1"><button onClick={() => setDetailsEmpresa(e)} title="Visualizar detalhes" className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg"><Eye size={16} /></button><button onClick={() => openEdit(e)} title="Editar registro" className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg"><Pencil size={16} /></button><button onClick={() => setDeletingId(e.id)} title="Excluir registro" className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button></div> },
  ];
  return <>
    <Header title="Gestão de Empresas" subtitle="Organizações e empresas proprietárias dos espaços físicos" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void loadEmpresas()} disabled={isLoading} title="Atualizar lista" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={17} className={isLoading ? "animate-spin" : ""} /></button>} />
    <main className="p-6 max-w-7xl mx-auto w-full space-y-5">{feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}<DataTable columns={columns} data={empresas} isLoading={isLoading} searchPlaceholder="Buscar por razão social, CNPJ ou e-mail..." searchFilter={(e, q) => [e.corporate_name, e.trade_name ?? "", e.cnpj, e.email ?? "", e.phone].some((v) => v.toLowerCase().includes(q))} onAdd={openCreate} addButtonLabel="Nova Empresa" emptyMessage="Nenhuma empresa cadastrada." />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingEmpresa ? `Editar Empresa #${editingEmpresa.id}` : "Cadastrar Nova Empresa"} subtitle="Preencha os dados cadastrais da empresa"><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Razão Social *<input required value={formData.corporate_name} onChange={(e) => setFormData({ ...formData, corporate_name: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="Empresa XYZ Ltda" /></label><label className="block text-xs font-semibold text-slate-700">Nome Fantasia<input value={formData.trade_name ?? ""} onChange={(e) => setFormData({ ...formData, trade_name: e.target.value || null })} className={`${inputClass} mt-1.5`} placeholder="Nome comercial (opcional)" /></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-xs font-semibold text-slate-700">CNPJ *<MaskedInput required value={formData.cnpj} formatValue={formatCnpj} onValueChange={(cnpj) => setFormData({ ...formData, cnpj })} inputMode="numeric" maxLength={18} className={`${inputClass} mt-1.5`} placeholder="00.000.000/0000-00" /></label><label className="block text-xs font-semibold text-slate-700">Telefone *<MaskedInput required type="tel" value={formData.phone} formatValue={formatPhone} onValueChange={(phone) => setFormData({ ...formData, phone })} inputMode="numeric" maxLength={15} className={`${inputClass} mt-1.5`} placeholder="(48) 99999-9999" /></label></div><label className="block text-xs font-semibold text-slate-700">E-mail legado (opcional)<input type="email" value={formData.email ?? ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="contato@empresa.com" /></label><div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setIsFormOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-50">{isSubmitting ? "Salvando..." : editingEmpresa ? "Salvar Alterações" : "Cadastrar Empresa"}</button></div></form></Modal>
      <Modal isOpen={!!detailsEmpresa} onClose={() => setDetailsEmpresa(null)} title="Detalhes da Empresa" subtitle={`Informações do registro #${detailsEmpresa?.id}`}>{detailsEmpresa && <div className="space-y-4"><div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><h4 className="font-bold text-slate-800">{detailsEmpresa.corporate_name}</h4><p className="text-sm text-slate-500">{detailsEmpresa.trade_name || "Sem nome fantasia"}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{[["CNPJ", formatCnpj(detailsEmpresa.cnpj)], ["Telefone", formatPhone(detailsEmpresa.phone)], ["E-mail", detailsEmpresa.email || "—"], ["Criada em", detailsEmpresa.created_at ? new Date(detailsEmpresa.created_at).toLocaleDateString("pt-BR") : "—"]].map(([label, value]) => <div key={label} className="p-3 bg-slate-50 rounded-lg"><span className="text-xs text-slate-400 block mb-1">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>)}</div><div className="flex justify-end gap-2 pt-4 border-t"><button onClick={() => { const e = detailsEmpresa; setDetailsEmpresa(null); openEdit(e); }} className="px-4 py-2 text-xs text-blue-600 bg-blue-50 rounded-lg">Editar Dados</button><button onClick={() => setDetailsEmpresa(null)} className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg">Fechar</button></div></div>}</Modal>
      <ConfirmDialog isOpen={deletingId !== null} onClose={() => setDeletingId(null)} onConfirm={() => void remove()} isLoading={isDeleting} message="Tem certeza que deseja excluir esta empresa? Esta ação removerá o registro permanentemente." />
    </main>
  </>;
}
