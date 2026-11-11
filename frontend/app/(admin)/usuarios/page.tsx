"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header";
import DataTable, { Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { usuarioService, Usuario, UsuarioFormData, UserRole } from "../../../lib/services/usuarioService";
import { empresaService, Empresa } from "../../../lib/services/empresaService";
import { MaskedInput } from "../../../components/MaskedInput";
import { digitsOnly, formatCpfCnpj, formatPhone } from "../../../lib/inputMasks";
import { Eye, Pencil, Trash2, Mail, Phone, Lock, User, RefreshCw } from "lucide-react";

interface UsuariosPageProps { onOpenSidebar?: () => void }
const inputClass = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800";
const roleLabels: Record<UserRole, string> = { ADMIN: "Administrador", CLIENT: "Cliente", RECEPTION: "Recepção" };
const emptyForm = (): UsuarioFormData => ({ name: "", email: "", password: "", phone: "", role: "CLIENT", cpf_cnpj: null, company_id: null });

export default function UsuariosPage({ onOpenSidebar }: UsuariosPageProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<UsuarioFormData>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsUsuario, setDetailsUsuario] = useState<Usuario | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, companies] = await Promise.all([usuarioService.getAll(), empresaService.getAll()]);
      setUsuarios(users);
      setEmpresas(companies);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao carregar usuários." });
    } finally { setIsLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void loadUsuarios(); }, 0); return () => window.clearTimeout(timer); }, [loadUsuarios]);
  const companyName = (id: number | null) => id == null ? "—" : (empresas.find((e) => e.id === id)?.corporate_name ?? `Empresa #${id}`);

  const openCreate = () => { setEditingUsuario(null); setFormData(emptyForm()); setFeedback(null); setIsFormOpen(true); };
  const openEdit = (u: Usuario) => {
    setEditingUsuario(u);
    setFormData({ name: u.name, email: u.email, password: "", phone: formatPhone(u.phone), role: u.role, cpf_cnpj: formatCpfCnpj(u.cpf_cnpj), company_id: u.company_id });
    setFeedback(null); setIsFormOpen(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || (!editingUsuario && !formData.password)) {
      setFeedback({ type: "error", message: "Nome, e-mail e senha (no cadastro) são obrigatórios." }); return;
    }
    setIsSubmitting(true); setFeedback(null);
    const base = { name: formData.name.trim(), email: formData.email.trim(), phone: digitsOnly(formData.phone) || null, role: formData.role, cpf_cnpj: digitsOnly(formData.cpf_cnpj) || null, company_id: formData.company_id };
    try {
      if (editingUsuario) {
        const payload: Partial<UsuarioFormData> = base;
        if (formData.password) payload.password = formData.password;
        await usuarioService.update(editingUsuario.id, payload);
        setFeedback({ type: "success", message: "Usuário atualizado com sucesso!" });
      } else {
        await usuarioService.create({ ...base, password: formData.password });
        setFeedback({ type: "success", message: "Usuário cadastrado com sucesso!" });
      }
      setIsFormOpen(false); await loadUsuarios();
    } catch (err: unknown) { setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao salvar usuário." }); }
    finally { setIsSubmitting(false); }
  };
  const remove = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try { await usuarioService.delete(deletingId); setDeletingId(null); setFeedback({ type: "success", message: "Usuário excluído com sucesso!" }); await loadUsuarios(); }
    catch (err: unknown) { setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao excluir usuário." }); }
    finally { setIsDeleting(false); }
  };

  const columns: Column<Usuario>[] = [
    { header: "ID", className: "w-16", cell: (u) => <span className="font-mono text-xs font-bold text-slate-500">#{u.id}</span> },
    { header: "Nome", cell: (u) => <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">{u.name.charAt(0).toUpperCase()}</div><span className="font-semibold text-slate-800">{u.name}</span></div> },
    { header: "E-mail", cell: (u) => <span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-slate-400" />{u.email}</span> },
    { header: "Telefone", cell: (u) => <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-slate-400" />{formatPhone(u.phone) || "—"}</span> },
    { header: "Perfil", cell: (u) => <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold">{roleLabels[u.role] ?? u.role}</span> },
    { header: "Ações", className: "text-right w-36", cell: (u) => <div className="flex items-center justify-end gap-1"><button onClick={() => setDetailsUsuario(u)} title="Visualizar detalhes" className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg"><Eye size={16} /></button><button onClick={() => openEdit(u)} title="Editar registro" className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg"><Pencil size={16} /></button><button onClick={() => setDeletingId(u.id)} title="Excluir registro" className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button></div> },
  ];

  return <>
    <Header title="Gestão de Usuários" subtitle="Gerenciamento de usuários que utilizam e reservam espaços" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void loadUsuarios()} disabled={isLoading} title="Atualizar lista" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={17} className={isLoading ? "animate-spin" : ""} /></button>} />
    <main className="p-6 max-w-7xl mx-auto w-full space-y-5">{feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}
      <DataTable columns={columns} data={usuarios} isLoading={isLoading} searchPlaceholder="Buscar por nome, e-mail, telefone ou perfil..." searchFilter={(u, q) => [u.name, u.email, u.phone ?? "", roleLabels[u.role] ?? u.role].some((s) => s.toLowerCase().includes(q))} onAdd={openCreate} addButtonLabel="Novo Usuário" emptyMessage="Nenhum usuário cadastrado." />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingUsuario ? `Editar Usuário #${editingUsuario.id}` : "Cadastrar Novo Usuário"} subtitle="Preencha as informações do usuário" maxWidth="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-slate-700">Nome completo *<input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="Ex.: João da Silva" /></label>
            <label className="text-xs font-semibold text-slate-700">E-mail *<input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="joao@email.com" /></label>
            <label className="text-xs font-semibold text-slate-700">Senha {editingUsuario ? "(opcional para alterar)" : "*"}<span className="relative block mt-1.5"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" required={!editingUsuario} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${inputClass} pl-9`} autoComplete="new-password" placeholder={editingUsuario ? "Deixe em branco para manter" : "Defina uma senha"} /></span></label>
            <label className="text-xs font-semibold text-slate-700">Perfil *<select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className={`${inputClass} mt-1.5`}><option value="ADMIN">Administrador</option><option value="CLIENT">Cliente</option><option value="RECEPTION">Recepção</option></select></label>
            <label className="text-xs font-semibold text-slate-700">CPF/CNPJ<MaskedInput value={formData.cpf_cnpj} formatValue={formatCpfCnpj} onValueChange={(cpf_cnpj) => setFormData({ ...formData, cpf_cnpj: cpf_cnpj || null })} inputMode="numeric" maxLength={18} className={`${inputClass} mt-1.5`} placeholder="000.000.000-00 ou 00.000.000/0000-00" /></label>
            <label className="text-xs font-semibold text-slate-700">Telefone<MaskedInput type="tel" value={formData.phone} formatValue={formatPhone} onValueChange={(phone) => setFormData({ ...formData, phone })} inputMode="numeric" maxLength={15} className={`${inputClass} mt-1.5`} placeholder="(48) 99999-9999" /></label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Empresa vinculada<select value={formData.company_id ?? ""} onChange={(e) => setFormData({ ...formData, company_id: e.target.value ? Number(e.target.value) : null })} className={`${inputClass} mt-1.5`}><option value="">Sem empresa</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.corporate_name} (#{e.id})</option>)}</select></label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button type="button" onClick={() => setIsFormOpen(false)} disabled={isSubmitting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">{isSubmitting ? "Salvando..." : editingUsuario ? "Salvar Alterações" : "Cadastrar Usuário"}</button></div>
        </form>
      </Modal>
      <Modal isOpen={!!detailsUsuario} onClose={() => setDetailsUsuario(null)} title="Detalhes do Usuário" subtitle={`Informações completas do registro #${detailsUsuario?.id}`}>
        {detailsUsuario && <div className="space-y-4"><div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100"><div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg"><User size={22} /></div><div><h4 className="font-bold text-slate-800">{detailsUsuario.name}</h4><p className="text-xs text-slate-500">ID #{detailsUsuario.id} · {roleLabels[detailsUsuario.role] ?? detailsUsuario.role}</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{[["E-mail", detailsUsuario.email], ["Telefone", formatPhone(detailsUsuario.phone) || "—"], ["CPF/CNPJ", formatCpfCnpj(detailsUsuario.cpf_cnpj) || "—"], ["Empresa", companyName(detailsUsuario.company_id)], ["Criado em", detailsUsuario.created_at ? new Date(detailsUsuario.created_at).toLocaleString("pt-BR") : "—"]].map(([label, value]) => <div key={label} className="p-3 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs text-slate-400 block mb-1">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>)}</div><div className="flex justify-end gap-2 pt-4 border-t"><button onClick={() => { const u = detailsUsuario; setDetailsUsuario(null); openEdit(u); }} className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">Editar Dados</button><button onClick={() => setDetailsUsuario(null)} className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg">Fechar</button></div></div>}
      </Modal>
      <ConfirmDialog isOpen={deletingId !== null} onClose={() => setDeletingId(null)} onConfirm={() => void remove()} isLoading={isDeleting} message="Tem certeza que deseja excluir este usuário? Esta ação removerá o registro permanentemente." />
    </main>
  </>;
}
