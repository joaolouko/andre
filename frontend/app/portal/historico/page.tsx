"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, History, Loader2, XCircle } from "lucide-react";
import Alert from "../../../components/Alert";
import { portalService } from "../../../lib/services/portalService";
import type { Reserva, BookingStatus } from "../../../lib/services/reservaService";

const statusText: Record<BookingStatus, string> = { PENDING: "Pendente", APPROVED: "Aprovada", REJECTED: "Rejeitada", CANCELLED: "Cancelada" };
const statusStyle: Record<BookingStatus, string> = { PENDING: "bg-amber-50 text-amber-800", APPROVED: "bg-emerald-50 text-emerald-800", REJECTED: "bg-rose-50 text-rose-800", CANCELLED: "bg-slate-100 text-slate-600" };
const format = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

export default function HistoricoPage() {
  const [bookings, setBookings] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setBookings(await portalService.getReservations()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Seu acompanhamento</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Minhas reservas</h1><p className="mt-2 text-sm text-slate-500">Consulte o andamento e cada alteração registada pela equipe.</p></header>
    {error && <Alert type="error" message={error} onClose={() => setError("")} />}
    {loading ? <div className="flex justify-center py-20 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando histórico…</div> : bookings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><History className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-bold text-slate-800">Nenhum agendamento ainda</h2><p className="mt-1 text-sm text-slate-500">Quando você solicitar um espaço, as atualizações aparecerão aqui.</p></div> : <div className="space-y-4">{bookings.map((booking) => <article key={booking.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">{booking.space_name || `Espaço #${booking.space_id}`}</h2><p className="mt-1 text-xs text-slate-500">Reserva #{booking.id} · criada {format(booking.created_at)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle[booking.status]}`}>{statusText[booking.status]}</span></div><div className="grid gap-3 p-5 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><CalendarDays size={18} className="text-blue-600" /><div><span className="block text-[11px] text-slate-500">Início</span><strong className="text-sm text-slate-800">{format(booking.start_datetime)}</strong></div></div><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Clock3 size={18} className="text-blue-600" /><div><span className="block text-[11px] text-slate-500">Fim</span><strong className="text-sm text-slate-800">{format(booking.end_datetime)}</strong></div></div></div>{booking.rejection_reason && <div className="mx-5 mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><strong>Justificativa:</strong> {booking.rejection_reason}</div>}<div className="border-t border-slate-100 bg-slate-50/70 p-5"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"><History size={15} /> Histórico de alterações</h3><ol className="mt-4 space-y-3">{(booking.history || []).map((entry, index) => <li key={`${entry.changed_at}-${index}`} className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-slate-200">{entry.action === "APPROVED" ? <CheckCircle2 size={15} /> : entry.action === "REJECTED" || entry.action === "CANCELLED" ? <XCircle size={15} /> : <Clock3 size={15} />}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{entry.action === "REQUESTED" ? "Solicitação enviada" : entry.action === "APPROVED" ? "Reserva aprovada" : entry.action === "REJECTED" ? "Reserva rejeitada" : entry.action === "CANCELLED" ? "Reserva cancelada" : "Reserva atualizada"}</p><p className="text-xs text-slate-500">{format(entry.changed_at)}{entry.note ? ` · ${entry.note}` : ""}</p></div></li>)}{!(booking.history || []).length && <li className="text-xs text-slate-400">Sem alterações registadas.</li>}</ol></div></article>)}</div>}
  </div>;
}
