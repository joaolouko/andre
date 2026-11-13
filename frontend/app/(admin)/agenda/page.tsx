"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header";
import Alert from "../../../components/Alert";
import { agendaService, type AgendaData } from "../../../lib/services/agendaService";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2, RefreshCw, Wrench } from "lucide-react";

const TZ = "America/Sao_Paulo";
type View = "month" | "week" | "day";
const pad = (value: number) => String(value).padStart(2, "0");
const fromKey = (key: string) => new Date(`${key}T12:00:00`);
const keyFromDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (key: string, days: number) => { const date = fromKey(key); date.setDate(date.getDate() + days); return keyFromDate(date); };
const bizDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const bizMinute = (value: string) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)).map((item) => [item.type, item.value])); return Number(p.hour) * 60 + Number(p.minute); };
const timeLabel = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const formatTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const formatDay = (key: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "2-digit", month: "long" }) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ }).format(fromKey(key));
const statusLabel: Record<string, string> = { PENDING: "Pendente", APPROVED: "Aprovada", REJECTED: "Rejeitada", CANCELLED: "Cancelada" };

function weekStart(key: string) { const date = fromKey(key); const day = date.getDay(); date.setDate(date.getDate() - ((day + 6) % 7)); return keyFromDate(date); }
function rangeFor(view: View, selectedDate: string) {
  if (view === "day") return { from: selectedDate, to: selectedDate };
  if (view === "week") { const from = weekStart(selectedDate); return { from, to: addDays(from, 6) }; }
  const date = fromKey(selectedDate); const year = date.getFullYear(); const month = date.getMonth();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}` };
}
function freeWindows(date: string, spaceId: number, data: AgendaData | null) {
  if (!data || !spaceId) return [];
  const weekday = fromKey(date).getDay();
  const open = data.availabilities.filter((item) => item.space_id === spaceId && (item.valid_on ? item.valid_on === date : item.day_of_week === weekday)).map((item) => [Number(item.start_time.slice(0, 2)) * 60 + Number(item.start_time.slice(3)), Number(item.end_time.slice(0, 2)) * 60 + Number(item.end_time.slice(3))] as [number, number]).sort((a, b) => a[0] - b[0]);
  const busy = [
    ...data.reservations.filter((item) => item.space_id === spaceId && ["PENDING", "APPROVED"].includes(item.status)).map((item) => [item.start_datetime, item.end_datetime] as [string, string]),
    ...data.blocks.filter((item) => item.space_id === spaceId).map((item) => [item.start_datetime, item.end_datetime] as [string, string]),
  ].filter(([start, end]) => bizDate(start) <= date && bizDate(end) >= date).map(([start, end]) => [bizDate(start) < date ? 0 : bizMinute(start), bizDate(end) > date ? 1440 : bizMinute(end)] as [number, number]);
  let result = open;
  for (const [start, end] of busy) result = result.flatMap(([left, right]) => end <= left || start >= right ? [[left, right] as [number, number]] : [[left, Math.max(left, start)], [Math.min(right, end), right]].filter(([a, b]) => b > a) as [number, number][]);
  return result.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
}

interface AgendaPageProps { onOpenSidebar?: () => void }
export default function AgendaPage({ onOpenSidebar }: AgendaPageProps) {
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState(() => keyFromDate(new Date()));
  const [spaceId, setSpaceId] = useState<number | null>(null);
  const [data, setData] = useState<AgendaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => rangeFor(view, selectedDate), [view, selectedDate]);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await agendaService.getRange(range.from, range.to, spaceId || undefined)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a agenda."); } finally { setLoading(false); } }, [range.from, range.to, spaceId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const periodDays = useMemo(() => { const count = view === "day" ? 1 : view === "week" ? 7 : (fromKey(range.to).getDate() - fromKey(range.from).getDate() + 1); const start = view === "week" ? range.from : range.from; return Array.from({ length: count }, (_, index) => addDays(start, index)); }, [view, range.from, range.to]);
  const gridDays = useMemo(() => { const start = weekStart(range.from); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }, [range.from]);
  const reservationsOn = (key: string) => (data?.reservations || []).filter((item) => bizDate(item.start_datetime) <= key && bizDate(item.end_datetime) >= key && (!spaceId || item.space_id === spaceId));
  const blocksOn = (key: string) => (data?.blocks || []).filter((item) => bizDate(item.start_datetime) <= key && bizDate(item.end_datetime) >= key && (!spaceId || item.space_id === spaceId));
  const eventsCount = (key: string) => reservationsOn(key).length + blocksOn(key).length;
  const move = (direction: number) => { if (view === "day") setSelectedDate((current) => addDays(current, direction)); else if (view === "week") setSelectedDate((current) => addDays(current, direction * 7)); else { const date = fromKey(selectedDate); date.setMonth(date.getMonth() + direction); setSelectedDate(keyFromDate(date)); } };
  const goToday = () => setSelectedDate(keyFromDate(new Date()));
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: TZ }).format(fromKey(range.from));
  const heading = view === "month" ? monthTitle : view === "week" ? `${formatDay(range.from, { day: "2-digit", month: "short" })} – ${formatDay(range.to, { day: "2-digit", month: "short", year: "numeric" })}` : formatDay(selectedDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return <>
    <Header title="Agenda" subtitle="Visualize ocupação, horários livres, solicitações e bloqueios em um só lugar" onOpenSidebar={onOpenSidebar || (() => {})} actions={<button onClick={() => void load()} disabled={loading} title="Atualizar agenda" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>} />
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">{error && <Alert type="error" message={error} onClose={() => setError("")} />}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><CalendarDays size={20} /></span><div><p className="text-xs text-slate-500">Período selecionado</p><h1 className="text-lg font-bold capitalize text-slate-900">{heading}</h1></div></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Filtrar por espaço" value={spaceId ?? ""} onChange={(event) => setSpaceId(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"><option value="">Todos os espaços</option>{data?.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select><div className="flex rounded-lg border border-slate-200 p-1">{([["month", "Mês"], ["week", "Semana"], ["day", "Dia"]] as const).map(([value, label]) => <button key={value} onClick={() => setView(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div><div className="flex items-center gap-1"><button onClick={() => move(-1)} aria-label="Período anterior" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button><button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hoje</button><button onClick={() => move(1)} aria-label="Próximo período" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button></div></div></div><div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pendente</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Aprovada</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Manutenção/evento</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Horário livre</span></div></section>
      {loading ? <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando agenda…</div> : view === "month" ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((name) => <div key={name} className="py-3">{name}</div>)}</div><div className="grid grid-cols-7">{gridDays.map((day) => { const sameMonth = fromKey(day).getMonth() === fromKey(range.from).getMonth(); const isSelected = day === selectedDate; const count = eventsCount(day); return <button key={day} onClick={() => setSelectedDate(day)} className={`min-h-20 border-b border-r border-slate-100 p-2 text-left transition hover:bg-blue-50/60 sm:min-h-24 ${sameMonth ? "bg-white" : "bg-slate-50/70"} ${isSelected ? "ring-2 ring-inset ring-blue-400" : ""}`}><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isSelected ? "bg-blue-600 text-white" : sameMonth ? "text-slate-700" : "text-slate-300"}`}>{fromKey(day).getDate()}</span>{count > 0 && <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{count} evento(s)</span></div>}</button>; })}</div><div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5"><h2 className="font-bold capitalize text-slate-900">{formatDay(selectedDate, { weekday: "long", day: "2-digit", month: "long" })}</h2><DayAgenda data={data} spaceId={spaceId} reservations={reservationsOn(selectedDate)} blocks={blocksOn(selectedDate)} free={spaceId ? freeWindows(selectedDate, spaceId, data) : []} /></div></section> : <section className={`grid gap-4 ${view === "week" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>{periodDays.map((day) => <article key={day} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-3 border-b border-slate-100 pb-3 text-sm font-bold capitalize text-slate-900">{formatDay(day)}</h2><DayAgenda data={data} spaceId={spaceId} reservations={reservationsOn(day)} blocks={blocksOn(day)} free={spaceId ? freeWindows(day, spaceId, data) : []} /></article>)}</section>}
      {!spaceId && <p className="text-center text-xs text-slate-400">Escolha um espaço no filtro para ver horários livres; reservas e bloqueios de todos os espaços permanecem visíveis.</p>}
    </main>
  </>;
}

function DayAgenda({ data, spaceId, reservations, blocks, free }: { data: AgendaData | null; spaceId: number | null; reservations: AgendaData["reservations"]; blocks: AgendaData["blocks"]; free: [number, number][] }) {
  const events = [
    ...reservations.map((item) => ({ id: `r${item.id}`, start: item.start_datetime, end: item.end_datetime, title: data?.spaces.find((space) => space.id === item.space_id)?.name || `Espaço #${item.space_id}`, type: item.status, description: statusLabel[item.status] || item.status })),
    ...blocks.map((item) => ({ id: `b${item.id}`, start: item.start_datetime, end: item.end_datetime, title: item.title, type: item.kind, description: `${item.kind === "MAINTENANCE" ? "Manutenção" : "Evento interno"} · ${data?.spaces.find((space) => space.id === item.space_id)?.name || `Espaço #${item.space_id}`}` })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const freeList = free.length ? free : spaceId ? [] : [];
  return <div className="space-y-2 pt-3">{spaceId && freeList.length > 0 && <div className="mb-3 rounded-xl bg-cyan-50/70 p-3"><p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-900"><Clock3 size={13} /> Horários livres</p><div className="flex flex-wrap gap-1.5">{freeList.map(([start, end]) => <span key={`${start}-${end}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-100">{timeLabel(start)}–{timeLabel(end)}</span>)}</div></div>}{!events.length && !freeList.length && <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">{spaceId ? "Sem eventos ou horários livres configurados para este espaço/dia." : "Sem reservas ou bloqueios neste dia."}</div>}{events.map((item) => { const isBlock = item.type === "MAINTENANCE" || item.type === "INTERNAL_EVENT"; const tone = isBlock ? "border-violet-200 bg-violet-50 text-violet-900" : item.type === "APPROVED" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : item.type === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-700"; return <div key={item.id} className={`rounded-xl border p-3 ${tone}`}><div className="flex items-start gap-2"><span className="mt-0.5">{isBlock ? <Wrench size={14} /> : <CalendarDays size={14} />}</span><div className="min-w-0"><p className="truncate text-xs font-bold">{item.title}</p><p className="mt-1 text-[11px] opacity-80">{formatTime(item.start)}–{formatTime(item.end)} · {item.description}</p></div></div></div>; })}</div>;
}
