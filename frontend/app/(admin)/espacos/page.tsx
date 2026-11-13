"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header";
import DataTable, { type Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { espacoService, type Espaco, type EspacoFormData, type SpaceType } from "../../../lib/services/espacoService";
import { empresaService, type Empresa } from "../../../lib/services/empresaService";
import { Eye, Pencil, Trash2, DoorOpen, Users, Building2, RefreshCw, Wrench } from "lucide-react";

interface EspacosPageProps { onOpenSidebar?: () => void }
const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const typeLabels: Record<SpaceType, string> = { COWORKING: "Coworking", LAB: "Laboratório", MEETING_ROOM: "Sala de reunião" };
const blank = (companyId: number | null = null): EspacoFormData => ({ name: "", type: "COWORKING", capacity: 10, description: "", equipment: [], is_active: true, company_id: companyId });

export default function EspacosPage({ onOpenSidebar }: EspacosPageProps) {
  const [spaces, setSpaces] = useState<Espaco[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Espaco | null>(null);
  const [form, setForm] = useState<EspacoFormData>(blank());
  const [equipmentText, setEquipmentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<Espaco | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const [spaceData, companyData] = await Promise.all([espacoService.getAll(), empresaService.getAll()]); setSpaces(spaceData); setCompanies(companyData); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar dados dos espaços." }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void loadData(); }, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const companyName = (id: number | null) => id == null ? "Sem empresa" : companies.find((company) => company.id === id)?.corporate_name ?? `Empresa #${id}`;
  const openCreate = () => { setEditing(null); setForm(blank(companies[0]?.id ?? null)); setEquipmentText(""); setFeedback(null); setFormOpen(true); };
  const openEdit = (space: Espaco) => { setEditing(space); setForm({ name: space.name, type: space.type, capacity: space.capacity, description: space.description, equipment: space.equipment || [], is_active: space.is_active, company_id: space.company_id }); setEquipmentText((space.equipment || []).join(", ")); setFeedback(null); setFormOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { setFeedback({ type: "error", message: "Informe o nome do espaço." }); return; }
    if (!form.company_id) { setFeedback({ type: "error", message: "Selecione a empresa associada ao espaço." }); return; }
    if (form.capacity < 1) { setFeedback({ type: "error", message: "A capacidade deve ser de pelo menos uma pessoa." }); return; }
    const payload = { ...form, name: form.name.trim(), description: form.description.trim(), capacity: Number(form.capacity), equipment: [...new Set(equipmentText.split(",").map((item) => item.trim()).filter(Boolean))] };
    setSubmitting(true); setFeedback(null);
    try { if (editing) { await espacoService.update(editing.id, payload); setFeedback({ type: "success", message: "Espaço atualizado com sucesso." }); } else { await espacoService.create(payload); setFeedback({ type: "success", message: "Espaço cadastrado com sucesso." }); } setFormOpen(false); await loadData(); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao salvar espaço." }); }
    finally { setSubmitting(false); }
  };
  const remove = async () => { if (deletingId === null) return; setDeleting(true); try { await espacoService.delete(deletingId); setDeletingId(null); setFeedback({ type: "success", message: "Espaço excluído com sucesso." }); await loadData(); } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao excluir espaço." }); } finally { setDeleting(false); } };

  const columns: Column<Espaco>[] = [
    { header: "ID", className: "w-16", cell: (space) => <span className="font-mono text-xs text-slate-500">#{space.id}</span> },
    { header: "Espaço", cell: (space) => <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><DoorOpen size={16} /></span><span><strong className="block text-slate-800">{space.name}</strong><span className="line-clamp-1 text-xs text-slate-400">{space.description}</span></span></div> },
    { header: "Tipo", cell: (space) => typeLabels[space.type] ?? space.type },
    { header: "Capacidade", cell: (space) => <span className="inline-flex items-center gap-1.5 text-xs"><Users size={14} className="text-slate-400" />{space.capacity} pessoa(s)</span> },
    { header: "Equipamentos", cell: (space) => <span className="text-xs text-slate-600">{space.equipment?.length ? space.equipment.slice(0, 2).join(", ") + (space.equipment.length > 2 ? ` +${space.equipment.length - 2}` : "") : "—"}</span> },
    { header: "Estado", cell: (space) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${space.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{space.is_active ? "Ativo" : "Inativo"}</span> },
    { header: "Ações", className: "w-36 text-right", cell: (space) => <div className="flex justify-end gap-1"><button onClick={() => setDetails(space)} title="Ver detalhes" className="rounded-lg p-1.5 text-slate-500 hover:text-blue-600"><Eye size={16} /></button><button onClick={() => openEdit(space)} title="Editar" className="rounded-lg p-1.5 text-slate-500 hover:text-amber-600"><Pencil size={16} /></button><button onClick={() => setDeletingId(space.id)} title="Excluir" className="rounded-lg p-1.5 text-slate-500 hover:text-red-600"><Trash2 size={16} /></button></div> },
  ];
  return <>
    <Header title="Gestão de espaços" subtitle="Salas, laboratórios e ambientes disponíveis para reserva" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void loadData()} disabled={loading} title="Atualizar lista" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>} />
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">{feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}<DataTable columns={columns} data={spaces} isLoading={loading} searchPlaceholder="Buscar espaço, descrição, tipo ou equipamento..." searchFilter={(space, query) => [space.name, space.description, typeLabels[space.type], ...(space.equipment || [])].some((value) => value.toLowerCase().includes(query))} onAdd={openCreate} addButtonLabel="Novo espaço" emptyMessage="Nenhum espaço cadastrado." />
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Editar espaço #${editing.id}` : "Cadastrar espaço"} subtitle="Descreva o ambiente, capacidade e recursos disponíveis" maxWidth="lg"><form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-700">Nome do espaço *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} mt-1.5`} placeholder="Ex.: Sala Alpha" /></label>
        <label className="block text-xs font-semibold text-slate-700">Descrição<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} mt-1.5 resize-none`} placeholder="Detalhes, finalidade e informações úteis" /></label>
        <label className="block text-xs font-semibold text-slate-700">Equipamentos disponíveis<span className="mt-1 block font-normal text-slate-400">Separe os itens por vírgula.</span><input value={equipmentText} onChange={(event) => setEquipmentText(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="Projetor, quadro branco, webcam" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Tipo *<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SpaceType })} className={`${inputClass} mt-1.5`}><option value="COWORKING">Coworking</option><option value="LAB">Laboratório</option><option value="MEETING_ROOM">Sala de reunião</option></select></label><label className="block text-xs font-semibold text-slate-700">Capacidade (pessoas) *<input type="number" min={1} required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} className={`${inputClass} mt-1.5`} /></label></div>
        <label className="block text-xs font-semibold text-slate-700">Empresa proprietária *<select required value={form.company_id ?? ""} onChange={(event) => setForm({ ...form, company_id: event.target.value ? Number(event.target.value) : null })} className={`${inputClass} mt-1.5`}><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.corporate_name} (#{company.id})</option>)}</select></label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Espaço ativo para novas reservas</label>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} disabled={submitting} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={submitting || companies.length === 0} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar espaço"}</button></div>
      </form></Modal>
      <Modal isOpen={!!details} onClose={() => setDetails(null)} title="Detalhes do espaço" subtitle={`Informações do registro #${details?.id}`}>{details && <div className="space-y-4"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="font-bold text-slate-800">{details.name}</h3><p className="text-xs text-slate-500">{typeLabels[details.type]} · {details.is_active ? "Ativo" : "Inativo"}</p></div><div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="mb-1 block text-xs text-slate-400">Descrição</span>{details.description || "Sem descrição"}</div><div className="rounded-lg bg-slate-50 p-3"><span className="mb-2 flex items-center gap-1 text-xs text-slate-400"><Wrench size={13} /> Equipamentos</span><div className="flex flex-wrap gap-1.5">{(details.equipment || []).length ? details.equipment.map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">{item}</span>) : <span className="text-sm text-slate-500">Nenhum equipamento informado.</span>}</div></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-slate-50 p-3"><span className="mb-1 block text-xs text-slate-400">Empresa</span><b>{companyName(details.company_id)}</b><Building2 size={14} className="ml-1 inline text-slate-400" /></div><div className="rounded-lg bg-slate-50 p-3"><span className="mb-1 block text-xs text-slate-400">Capacidade</span><b>{details.capacity} pessoas</b></div></div><div className="flex justify-end gap-2 border-t pt-4"><button onClick={() => { const selected = details; setDetails(null); openEdit(selected); }} className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">Editar dados</button><button onClick={() => setDetails(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600">Fechar</button></div></div>}</Modal>
      <ConfirmDialog isOpen={deletingId !== null} onClose={() => setDeletingId(null)} onConfirm={() => void remove()} isLoading={deleting} message="Tem certeza que deseja excluir este espaço? Reservas e disponibilidades relacionadas poderão ser afetadas." />
    </main>
  </>;
}
