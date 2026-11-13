"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header";
import DataTable, { type Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { bloqueioService, type Bloqueio, type BloqueioFormData, type BlockKind } from "../../../lib/services/bloqueioService";
import { espacoService, type Espaco } from "../../../lib/services/espacoService";
import { isoToLocalDateTimeInput, localDateTimeInputToIso, formatDateTime } from "../../../lib/formatters";
import { CalendarDays, Pencil, RefreshCw, Trash2, Wrench, CalendarPlus } from "lucide-react";

interface BloqueiosPageProps { onOpenSidebar?: () => void }
const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const emptyForm = (): BloqueioFormData => ({ space_id: 0, kind: "MAINTENANCE", title: "", description: "", start_datetime: "", end_datetime: "" });

export default function BloqueiosPage({ onOpenSidebar }: BloqueiosPageProps) {
  const [blocks, setBlocks] = useState<Bloqueio[]>([]);
  const [spaces, setSpaces] = useState<Espaco[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bloqueio | null>(null);
  const [form, setForm] = useState<BloqueioFormData>(emptyForm());
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { const [blockData, spaceData] = await Promise.all([bloqueioService.getAll(), espacoService.getAll()]); setBlocks(blockData); setSpaces(spaceData); } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar os bloqueios." }); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const spaceName = (id: number) => spaces.find((space) => space.id === id)?.name || `Espaço #${id}`;
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm(), space_id: spaces.find((space) => space.is_active)?.id || spaces[0]?.id || 0 }); setStartLocal(""); setEndLocal(""); setNotice(null); setFormOpen(true); };
  const openEdit = (item: Bloqueio) => { setEditing(item); setForm({ space_id: item.space_id, kind: item.kind, title: item.title, description: item.description || "", start_datetime: item.start_datetime, end_datetime: item.end_datetime }); setStartLocal(isoToLocalDateTimeInput(item.start_datetime)); setEndLocal(isoToLocalDateTimeInput(item.end_datetime)); setFormOpen(true); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.space_id || !form.title.trim() || !startLocal || !endLocal) { setNotice({ type: "error", message: "Preencha espaço, título, início e fim." }); return; } if (new Date(endLocal) <= new Date(startLocal)) { setNotice({ type: "error", message: "O fim deve ser posterior ao início." }); return; } setSubmitting(true); setNotice(null); const payload = { ...form, title: form.title.trim(), description: form.description.trim(), start_datetime: localDateTimeInputToIso(startLocal), end_datetime: localDateTimeInputToIso(endLocal) }; try { if (editing) { await bloqueioService.update(editing.id, payload); setNotice({ type: "success", message: "Bloqueio atualizado." }); } else { await bloqueioService.create(payload); setNotice({ type: "success", message: "Bloqueio cadastrado; o intervalo foi validado contra reservas e outros bloqueios." }); } setFormOpen(false); await load(); } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o bloqueio." }); } finally { setSubmitting(false); } };
  const remove = async () => { if (deletingId === null) return; setDeleting(true); try { await bloqueioService.delete(deletingId); setDeletingId(null); setNotice({ type: "success", message: "Bloqueio removido." }); await load(); } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível remover o bloqueio." }); } finally { setDeleting(false); } };

  const columns: Column<Bloqueio>[] = [
    { header: "Tipo", cell: (item) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.kind === "MAINTENANCE" ? "bg-amber-50 text-amber-800" : "bg-violet-50 text-violet-800"}`}><Wrench size={13} />{item.kind === "MAINTENANCE" ? "Manutenção" : "Evento interno"}</span> },
    { header: "Título", cell: (item) => <div><strong className="text-slate-800">{item.title}</strong><p className="line-clamp-1 text-xs text-slate-400">{item.description || "Sem descrição"}</p></div> },
    { header: "Espaço", cell: (item) => <span className="text-sm text-slate-700">{spaceName(item.space_id)}</span> },
    { header: "Período", cell: (item) => <span className="text-xs leading-5 text-slate-600">{formatDateTime(item.start_datetime)}<br />até {formatDateTime(item.end_datetime)}</span> },
    { header: "Ações", className: "w-24 text-right", cell: (item) => <div className="flex justify-end gap-1"><button onClick={() => openEdit(item)} title="Editar bloqueio" className="rounded-lg p-1.5 text-slate-500 hover:text-amber-600"><Pencil size={16} /></button><button onClick={() => setDeletingId(item.id)} title="Remover bloqueio" className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600"><Trash2 size={16} /></button></div> },
  ];
  return <>
    <Header title="Manutenção e eventos" subtitle="Bloqueie espaços para manutenção programada ou eventos internos" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void load()} disabled={loading} title="Atualizar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>} />
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">{notice && <Alert type={notice.type} message={notice.message} onClose={() => setNotice(null)} />}<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm text-violet-900"><p><strong>Proteção de agenda:</strong> o backend impede criar bloqueios sobre reservas ativas ou outros bloqueios.</p><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800"><CalendarPlus size={15} /> Novo bloqueio</button></div><DataTable columns={columns} data={blocks} isLoading={loading} searchPlaceholder="Buscar por título, espaço ou tipo..." searchFilter={(item, query) => [item.title, item.description, spaceName(item.space_id), item.kind].some((value) => value.toLowerCase().includes(query))} onAdd={openCreate} addButtonLabel="Novo bloqueio" emptyMessage="Nenhum bloqueio ou evento interno cadastrado." />
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Editar bloqueio #${editing.id}` : "Cadastrar bloqueio"} subtitle="O período bloqueará novas reservas para o espaço escolhido" maxWidth="lg"><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Espaço *<select required value={form.space_id} onChange={(event) => setForm({ ...form, space_id: Number(event.target.value) })} className={`${inputClass} mt-1.5`}><option value={0}>Selecione um espaço</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}{space.is_active ? "" : " (inativo)"}</option>)}</select></label><label className="block text-xs font-semibold text-slate-700">Tipo *<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as BlockKind })} className={`${inputClass} mt-1.5`}><option value="MAINTENANCE">Manutenção</option><option value="INTERNAL_EVENT">Evento interno</option></select></label><label className="block text-xs font-semibold text-slate-700">Título *<input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`${inputClass} mt-1.5`} placeholder="Ex.: Manutenção do projetor" /></label><label className="block text-xs font-semibold text-slate-700">Descrição<textarea rows={2} maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} mt-1.5 resize-none`} placeholder="Informações adicionais para a equipe" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Início *<input type="datetime-local" required value={startLocal} onChange={(event) => setStartLocal(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-xs font-semibold text-slate-700">Fim *<input type="datetime-local" required value={endLocal} onChange={(event) => setEndLocal(event.target.value)} className={`${inputClass} mt-1.5`} /></label></div><div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><CalendarDays size={15} /> Horários informados no fuso local configurado pelo sistema.</div><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} disabled={submitting} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={submitting || spaces.length === 0} className="rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar bloqueio"}</button></div></form></Modal>
      <ConfirmDialog isOpen={deletingId !== null} onClose={() => setDeletingId(null)} onConfirm={() => void remove()} isLoading={deleting} message="Remover este bloqueio? O espaço voltará a aceitar reservas nos horários correspondentes à disponibilidade cadastrada." />
    </main>
  </>;
}
