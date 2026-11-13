"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header";
import DataTable, { type Column } from "../../../components/DataTable";
import Modal from "../../../components/Modal";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Alert from "../../../components/Alert";
import { useAuth } from "../../../lib/authContext";
import { reservaService, type Reserva, type ReservaFormData, type BookingStatus, type ReservationOptions } from "../../../lib/services/reservaService";
import { formatDateTime, isoToLocalDateTimeInput, localDateTimeInputToIso } from "../../../lib/formatters";
import { Eye, Pencil, Trash2, CalendarDays, DoorOpen, User, CheckCircle2, AlertCircle, XCircle, RefreshCw, History } from "lucide-react";

interface ReservasPageProps { onOpenSidebar?: () => void }
const inputClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labels: Record<BookingStatus, string> = { PENDING: "Pendente", APPROVED: "Aprovada", REJECTED: "Rejeitada", CANCELLED: "Cancelada" };
const emptyForm = (userId = 0, spaceId = 0): ReservaFormData => ({ user_id: userId, space_id: spaceId, start_datetime: "", end_datetime: "", status: "PENDING", rejection_reason: "" });

export default function ReservasPage({ onOpenSidebar }: ReservasPageProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [bookings, setBookings] = useState<Reserva[]>([]);
  const [options, setOptions] = useState<ReservationOptions>({ users: [], spaces: [] });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reserva | null>(null);
  const [form, setForm] = useState<ReservaFormData>(emptyForm());
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<Reserva | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [items, selectOptions] = await Promise.all([reservaService.getAll(), reservaService.getOptions()]); setBookings(items); setOptions(selectOptions); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar reservas." }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const clientUsers = useMemo(() => options.users.filter((item) => item.role === "CLIENT" || (editing && item.id === form.user_id)), [options.users, editing, form.user_id]);
  const selectableSpaces = useMemo(() => options.spaces.filter((item) => item.is_active || (editing && item.id === form.space_id)), [options.spaces, editing, form.space_id]);
  const userName = (id: number) => options.users.find((item) => item.id === id)?.name ?? `Usuário #${id}`;
  const spaceName = (id: number) => options.spaces.find((item) => item.id === id)?.name ?? `Espaço #${id}`;

  const openCreate = () => { setEditing(null); setForm(emptyForm(options.users.find((item) => item.role === "CLIENT")?.id ?? 0, options.spaces.find((item) => item.is_active)?.id ?? 0)); const now = new Date(); const offset = now.getTimezoneOffset() * 60000; const start = new Date(now.getTime() - offset).toISOString().slice(0, 16); const end = new Date(now.getTime() + 60 * 60000 - offset).toISOString().slice(0, 16); setStartLocal(start); setEndLocal(end); setFeedback(null); setFormOpen(true); };
  const openEdit = (booking: Reserva) => { setEditing(booking); setForm({ user_id: booking.user_id, space_id: booking.space_id, start_datetime: booking.start_datetime, end_datetime: booking.end_datetime, status: booking.status, rejection_reason: booking.rejection_reason || "" }); setStartLocal(isoToLocalDateTimeInput(booking.start_datetime)); setEndLocal(isoToLocalDateTimeInput(booking.end_datetime)); setFeedback(null); setFormOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.user_id || !form.space_id) { setFeedback({ type: "error", message: "Selecione o solicitante e o espaço." }); return; }
    if (!startLocal || !endLocal || new Date(endLocal) <= new Date(startLocal)) { setFeedback({ type: "error", message: "Informe um intervalo de início e fim válido." }); return; }
    if (editing && isAdmin && form.status === "REJECTED" && !form.rejection_reason?.trim()) { setFeedback({ type: "error", message: "A justificativa é obrigatória para rejeitar a reserva." }); return; }
    setSubmitting(true); setFeedback(null);
    const payload: ReservaFormData = { ...form, user_id: Number(form.user_id), space_id: Number(form.space_id), start_datetime: localDateTimeInputToIso(startLocal), end_datetime: localDateTimeInputToIso(endLocal), status: editing && isAdmin ? form.status : editing?.status ?? "PENDING", rejection_reason: form.rejection_reason?.trim() || null };
    try { if (editing) { await reservaService.update(editing.id, payload); setFeedback({ type: "success", message: "Reserva atualizada e validada." }); } else { await reservaService.create({ ...payload, status: "PENDING" }); setFeedback({ type: "success", message: "Reserva criada como pendente de aprovação." }); } setFormOpen(false); await load(); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao salvar reserva." }); }
    finally { setSubmitting(false); }
  };
  const updateStatus = async (booking: Reserva, status: "APPROVED" | "REJECTED", reason?: string) => {
    setPendingActionId(booking.id); setFeedback(null);
    try { await reservaService.update(booking.id, { status, rejection_reason: reason || null }); setFeedback({ type: "success", message: status === "APPROVED" ? "Reserva aprovada." : "Reserva rejeitada e justificativa registada." }); await load(); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível atualizar o status." }); }
    finally { setPendingActionId(null); }
  };
  const reject = (booking: Reserva) => { const reason = window.prompt("Informe a justificativa da rejeição:"); if (reason?.trim()) void updateStatus(booking, "REJECTED", reason.trim()); };
  const remove = async () => { if (deletingId === null) return; setDeleting(true); try { await reservaService.delete(deletingId); setDeletingId(null); setFeedback({ type: "success", message: "Reserva cancelada; o histórico foi preservado." }); await load(); } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Erro ao cancelar reserva." }); } finally { setDeleting(false); } };
  const badge = (status: BookingStatus) => { const style = status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : status === "CANCELLED" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-50 text-amber-700 border-amber-200"; const Icon = status === "APPROVED" ? CheckCircle2 : status === "REJECTED" || status === "CANCELLED" ? XCircle : AlertCircle; return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}><Icon size={12} />{labels[status]}</span>; };
  const columns: Column<Reserva>[] = [
    { header: "ID", className: "w-16", cell: (booking) => <span className="font-mono text-xs text-slate-500">#{booking.id}</span> },
    { header: "Solicitante", cell: (booking) => <span className="inline-flex items-center gap-2"><User size={14} className="text-slate-400" />{userName(booking.user_id)}</span> },
    { header: "Espaço", cell: (booking) => <span className="inline-flex items-center gap-1.5"><DoorOpen size={14} className="text-slate-400" />{spaceName(booking.space_id)}</span> },
    { header: "Início", cell: (booking) => <span className="inline-flex items-center gap-1.5 font-mono text-xs"><CalendarDays size={14} className="text-slate-400" />{formatDateTime(booking.start_datetime)}</span> },
    { header: "Status", cell: (booking) => badge(booking.status) },
    { header: "Ações", className: "w-44 text-right", cell: (booking) => <div className="flex justify-end gap-1">{isAdmin && booking.status === "PENDING" && <><button disabled={pendingActionId === booking.id} onClick={() => void updateStatus(booking, "APPROVED")} title="Aprovar reserva" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 size={16} /></button><button disabled={pendingActionId === booking.id} onClick={() => reject(booking)} title="Rejeitar com justificativa" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><XCircle size={16} /></button></>}<button onClick={() => setDetails(booking)} title="Ver detalhes e histórico" className="rounded-lg p-1.5 text-slate-500 hover:text-blue-600"><Eye size={16} /></button><button onClick={() => openEdit(booking)} title="Editar" className="rounded-lg p-1.5 text-slate-500 hover:text-amber-600"><Pencil size={16} /></button>{["PENDING", "APPROVED"].includes(booking.status) && <button onClick={() => setDeletingId(booking.id)} title="Cancelar, preservando histórico" className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600"><Trash2 size={16} /></button>}</div> },
  ];
  return <>
    <Header title="Gestão de reservas" subtitle="Solicitações, aprovações, acompanhamento e histórico de alterações" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void load()} disabled={loading} title="Atualizar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>} />
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">{feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}<div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900"><strong>Fluxo de aprovação:</strong> toda nova reserva começa PENDENTE. Somente ADMIN aprova ou rejeita; rejeições exigem justificativa. Cancelamentos mantêm o histórico.</div><DataTable columns={columns} data={bookings} isLoading={loading} searchPlaceholder="Buscar solicitante, espaço, data ou status..." searchFilter={(booking, query) => [userName(booking.user_id), spaceName(booking.space_id), formatDateTime(booking.start_datetime), labels[booking.status], booking.rejection_reason || ""].some((value) => value.toLowerCase().includes(query))} onAdd={openCreate} addButtonLabel="Nova reserva" emptyMessage="Nenhuma reserva cadastrada." />
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Editar reserva #${editing.id}` : "Criar reserva operacional"} subtitle={editing ? "Alterações serão validadas e incluídas no histórico." : "Novas reservas entram na fila como pendentes."} maxWidth="lg"><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Solicitante (perfil CLIENT) *<select required value={form.user_id} onChange={(event) => setForm({ ...form, user_id: Number(event.target.value) })} className={`${inputClass} mt-1.5`}><option value={0}>Selecione uma pessoa</option>{clientUsers.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.email})</option>)}</select></label><label className="block text-xs font-semibold text-slate-700">Espaço *<select required value={form.space_id} onChange={(event) => setForm({ ...form, space_id: Number(event.target.value) })} className={`${inputClass} mt-1.5`}><option value={0}>Selecione um espaço</option>{selectableSpaces.map((item) => <option key={item.id} value={item.id}>{item.name} · capacidade {item.capacity}{item.is_active ? "" : " · inativo (reserva legada)"}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Início *<input type="datetime-local" required value={startLocal} onChange={(event) => setStartLocal(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-xs font-semibold text-slate-700">Fim *<input type="datetime-local" required value={endLocal} onChange={(event) => setEndLocal(event.target.value)} className={`${inputClass} mt-1.5`} /></label></div>{editing && isAdmin && <><label className="block text-xs font-semibold text-slate-700">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BookingStatus })} className={`${inputClass} mt-1.5`}><option value="PENDING">Pendente</option><option value="APPROVED">Aprovada</option><option value="REJECTED">Rejeitada</option><option value="CANCELLED">Cancelada</option></select></label>{form.status === "REJECTED" && <label className="block text-xs font-semibold text-slate-700">Justificativa da rejeição *<textarea required rows={2} value={form.rejection_reason || ""} onChange={(event) => setForm({ ...form, rejection_reason: event.target.value })} className={`${inputClass} mt-1.5 resize-none`} placeholder="Explique por que a solicitação não foi aprovada" /></label>}</>}<p className="text-[11px] text-slate-500">Os conflitos de agenda e as janelas configuradas serão revalidados pelo backend.</p><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setFormOpen(false)} disabled={submitting} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={submitting || clientUsers.length === 0 || selectableSpaces.length === 0} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar pendente"}</button></div></form></Modal>
      <Modal isOpen={!!details} onClose={() => setDetails(null)} title="Detalhes e histórico" subtitle={`Reserva #${details?.id}`}>{details && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><strong className="text-slate-900">{spaceName(details.space_id)}</strong><p className="mt-1 text-xs text-slate-500">Solicitante: {userName(details.user_id)}</p></div>{badge(details.status)}</div><div className="grid gap-3 text-sm sm:grid-cols-2">{[["Início", formatDateTime(details.start_datetime)], ["Fim", formatDateTime(details.end_datetime)], ["Criada", formatDateTime(details.created_at)], ["Justificativa", details.rejection_reason || "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><span className="mb-1 block text-xs text-slate-400">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>)}</div><div className="border-t pt-4"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600"><History size={15} /> Histórico de alterações</h3><ol className="mt-3 space-y-3">{(details.history || []).map((entry, index) => <li key={`${entry.changed_at}-${index}`} className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div><p className="text-sm font-semibold text-slate-800">{entry.action} · {labels[entry.to_status]}</p><p className="text-xs text-slate-500">{formatDateTime(entry.changed_at)} · usuário #{entry.changed_by}{entry.note ? ` · ${entry.note}` : ""}</p></div></li>)}</ol></div><div className="flex justify-end border-t pt-3"><button onClick={() => setDetails(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600">Fechar</button></div></div>}</Modal>
      <ConfirmDialog isOpen={deletingId !== null} onClose={() => setDeletingId(null)} onConfirm={() => void remove()} isLoading={deleting} message="Cancelar esta reserva? O registro será preservado no histórico e deixará de bloquear o horário." />
    </main>
  </>;
}
