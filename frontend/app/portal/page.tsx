"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, DoorOpen, Loader2, MapPin, Users } from "lucide-react";
import Alert from "../../components/Alert";
import { portalService, type PortalAvailability } from "../../lib/services/portalService";
import type { Espaco } from "../../lib/services/espacoService";
import type { Reserva, BookingStatus } from "../../lib/services/reservaService";

const TZ = "America/Sao_Paulo";
const statusText: Record<BookingStatus, string> = { PENDING: "Aguardando aprovação", APPROVED: "Confirmada", REJECTED: "Não aprovada", CANCELLED: "Cancelada" };
const statusStyle: Record<BookingStatus, string> = { PENDING: "bg-amber-50 text-amber-800 ring-amber-200", APPROVED: "bg-emerald-50 text-emerald-800 ring-emerald-200", REJECTED: "bg-rose-50 text-rose-800 ring-rose-200", CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200" };
const pad = (value: number) => String(value).padStart(2, "0");
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeParts = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
const businessDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const businessMinutes = (value: string) => { const p = Object.fromEntries(timeParts(value).map((item) => [item.type, item.value])); return Number(p.hour) * 60 + Number(p.minute); };
const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const formatDateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(value));

function availableStarts(data: PortalAvailability | null, date: string, duration: number) {
  if (!data) return [];
  const busy = [
    ...data.reservations.map((item) => ({ start: item.start_datetime, end: item.end_datetime })),
    ...data.blocks.map((item) => ({ start: item.start_datetime, end: item.end_datetime })),
  ].filter((item) => businessDate(item.start) === date || businessDate(item.end) === date)
    .map((item) => ({ start: businessDate(item.start) < date ? 0 : businessMinutes(item.start), end: businessDate(item.end) > date ? 1440 : businessMinutes(item.end) }));
  const starts = new Set<number>();
  for (const window of data.windows) {
    const start = Number(window.start_time.slice(0, 2)) * 60 + Number(window.start_time.slice(3));
    const end = Number(window.end_time.slice(0, 2)) * 60 + Number(window.end_time.slice(3));
    for (let time = start; time + duration <= end; time += 30) {
      if (!busy.some((range) => time < range.end && time + duration > range.start)) starts.add(time);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

export default function PortalPage() {
  const [spaces, setSpaces] = useState<Espaco[]>([]);
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [date, setDate] = useState(() => localDate(new Date()));
  const [duration, setDuration] = useState(60);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [availability, setAvailability] = useState<PortalAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [spaceData, bookingData] = await Promise.all([portalService.getSpaces(), portalService.getReservations()]);
      setSpaces(spaceData); setReservations(bookingData);
      setSelectedSpace((current) => current && spaceData.some((space) => space.id === current) ? current : spaceData[0]?.id ?? null);
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível carregar o catálogo." }); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      if (!selectedSpace || !date) { setAvailability(null); setIsChecking(false); return; }
      setIsChecking(true); setSelectedStart(null);
      portalService.getAvailability(selectedSpace, date)
        .then((result) => { if (alive) setAvailability(result); })
        .catch((error: unknown) => { if (alive) { setAvailability(null); setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível consultar a disponibilidade." }); } })
        .finally(() => { if (alive) setIsChecking(false); });
    }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [selectedSpace, date]);

  const starts = useMemo(() => availableStarts(availability, date, duration), [availability, date, duration]);
  const selected = spaces.find((space) => space.id === selectedSpace) ?? null;
  const upcoming = reservations.filter((booking) => ["PENDING", "APPROVED"].includes(booking.status)).sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));

  const requestBooking = async () => {
    if (!selectedSpace || selectedStart === null) return;
    setIsSubmitting(true); setNotice(null);
    try {
      await portalService.requestReservation({ space_id: selectedSpace, date, start_time: hhmm(selectedStart), end_time: hhmm(selectedStart + duration), note: note.trim() || undefined });
      setNotice({ type: "success", message: "Solicitação enviada. Ela ficará pendente até a equipe aprová-la." });
      setNote(""); setSelectedStart(null);
      const [nextAvailability, nextReservations] = await Promise.all([portalService.getAvailability(selectedSpace, date), portalService.getReservations()]);
      setAvailability(nextAvailability); setReservations(nextReservations);
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível solicitar a reserva." }); }
    finally { setIsSubmitting(false); }
  };

  const cancelBooking = async (booking: Reserva) => {
    if (!window.confirm(`Cancelar a reserva #${booking.id}?`)) return;
    try {
      await portalService.cancelReservation(booking.id);
      setReservations(await portalService.getReservations());
      setNotice({ type: "success", message: "Reserva cancelada. O histórico foi preservado." });
      if (selectedSpace) setAvailability(await portalService.getAvailability(selectedSpace, date));
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "Não foi possível cancelar a reserva." }); }
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando espaços…</div>;
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg sm:p-9">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
      <div className="relative max-w-2xl"><span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Seu espaço, no seu tempo</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Encontre o lugar ideal para trabalhar.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Explore os espaços, confira horários livres e envie uma solicitação. Acompanhe a aprovação e todo o histórico por aqui.</p></div>
      <div className="relative mt-6 flex flex-wrap gap-3 text-xs text-blue-100"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><CheckCircle2 size={15} /> Disponibilidade atualizada</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Clock3 size={15} /> Aprovação pela equipe</span></div>
    </section>
    {notice && <Alert type={notice.type} message={notice.message} onClose={() => setNotice(null)} />}
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Catálogo</p><h2 className="mt-1 text-xl font-bold text-slate-900">Espaços disponíveis</h2></div><span className="text-xs text-slate-500">{spaces.length} espaço(s) ativo(s)</span></div>
        {spaces.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Nenhum espaço ativo para reservas no momento.</div> : <div className="grid gap-4 sm:grid-cols-2">{spaces.map((space) => <button key={space.id} onClick={() => setSelectedSpace(space.id)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedSpace === space.id ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><DoorOpen size={21} /></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Ativo</span></div><h3 className="mt-4 font-bold text-slate-900">{space.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{space.description || "Espaço disponível para agendamento."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"><Users size={13} /> Até {space.capacity}</span><span className="rounded-full bg-slate-100 px-2.5 py-1">{space.type === "LAB" ? "Laboratório" : space.type === "COWORKING" ? "Coworking" : "Sala de reunião"}</span></div>{space.equipment?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{space.equipment.map((item) => <span key={item} className="rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-800">{item}</span>)}</div>}</button>)}</div>}
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="text-blue-600" size={19} /><h2 className="font-bold text-slate-900">Solicitar horário</h2></div><p className="mt-1 text-xs text-slate-500">A solicitação fica pendente até ser aprovada.</p>
        <label className="mt-5 block text-xs font-semibold text-slate-700">Data<input type="date" min={localDate(new Date())} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
        <label className="mt-4 block text-xs font-semibold text-slate-700">Duração<select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setSelectedStart(null); }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={90}>1 hora e 30 min</option><option value={120}>2 horas</option><option value={180}>3 horas</option></select></label>
        {selected && <div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-700">{selected.name}</div><div className="mt-1 text-[11px] text-slate-500">Capacidade: {selected.capacity} pessoas</div></div>}
        <div className="mt-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Horários livres</span>{isChecking && <Loader2 size={14} className="animate-spin text-blue-600" />}</div>{!selectedSpace ? <p className="text-xs text-slate-500">Selecione um espaço para consultar.</p> : !starts.length ? <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">{isChecking ? "Consultando agenda…" : "Não há horários livres para esta duração e data."}</p> : <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto">{starts.map((start) => <button key={start} onClick={() => setSelectedStart(start)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${selectedStart === start ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50"}`}>{hhmm(start)}</button>)}</div>}</div>
        <label className="mt-4 block text-xs font-semibold text-slate-700">Observação (opcional)<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" placeholder="Conte à equipe como pretende usar o espaço" /></label>
        {selectedStart !== null && <p className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800"><Clock3 size={15} /> {hhmm(selectedStart)} – {hhmm(selectedStart + duration)}</p>}
        <button onClick={() => void requestBooking()} disabled={isSubmitting || selectedStart === null} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <CalendarDays size={17} />} Enviar solicitação</button>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">A solicitação será validada novamente no servidor antes de ser gravada.</p>
      </aside>
    </section>

    <section className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Acompanhamento</p><h2 className="mt-1 text-xl font-bold text-slate-900">Próximas reservas</h2></div><a href="/portal/historico" className="text-xs font-semibold text-blue-700 hover:underline">Ver histórico completo</a></div>
      {upcoming.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Você ainda não tem reservas pendentes ou confirmadas.</div> : <div className="grid gap-3 md:grid-cols-2">{upcoming.slice(0, 4).map((booking) => <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{spaces.find((space) => space.id === booking.space_id)?.name || `Espaço #${booking.space_id}`}</h3><p className="mt-1 text-xs text-slate-500">Reserva #{booking.id}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusStyle[booking.status]}`}>{statusText[booking.status]}</span></div><p className="mt-3 flex items-center gap-2 text-sm text-slate-700"><CalendarDays size={15} className="text-slate-400" /> {formatDateTime(booking.start_datetime)}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[11px] text-slate-400">{booking.history?.length ?? 0} alteração(ões) no histórico</span>{["PENDING", "APPROVED"].includes(booking.status) && <button onClick={() => void cancelBooking(booking)} className="text-xs font-semibold text-rose-600 hover:underline">Cancelar</button>}</div></article>)}</div>}
    </section>
    <p className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={14} /> Os horários são exibidos no fuso de Brasília (America/Sao_Paulo).</p>
  </div>;
}
