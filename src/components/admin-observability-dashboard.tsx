"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ProcessingEvent, ProcessingEventStatus } from "@/lib/observability";

interface AdminObservabilityDashboardProps {
  userEmail: string | null;
}

const STATUS_OPTIONS = ["", "started", "success", "warning", "error"];
const STAGE_OPTIONS = [
  "",
  "cv_upload",
  "pdf_parser",
  "pdf_extraction",
  "storage_upload",
  "analysis_preflight",
  "ai_analysis",
  "ai_response_parse",
  "analysis_persist",
  "analysis_request",
];

const statusStyle: Record<ProcessingEventStatus, string> = {
  started: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

const statusIcon = {
  started: Clock3,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export default function AdminObservabilityDashboard({
  userEmail,
}: AdminObservabilityDashboardProps) {
  const [events, setEvents] = useState<ProcessingEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0] ?? null,
    [events, selectedId]
  );

  const timelineEvents = useMemo(() => {
    if (!selectedEvent) return [];
    const related = events.filter((event) => {
      if (selectedEvent.request_id) {
        return event.request_id === selectedEvent.request_id;
      }
      if (selectedEvent.analysis_id) {
        return event.analysis_id === selectedEvent.analysis_id;
      }
      return event.cv_id && event.cv_id === selectedEvent.cv_id;
    });

    return related.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [events, selectedEvent]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return events;

    return events.filter((event) =>
      [
        event.request_id,
        event.cv_id,
        event.analysis_id,
        event.stage,
        event.source,
        event.error_code,
        event.error_message,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [events, query]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "150" });
      if (status) params.set("status", status);
      if (stage) params.set("stage", stage);

      const res = await fetch(`/api/admin/processing-events?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No he podido cargar los eventos.");
      }

      setEvents(data.events ?? []);
      setSelectedId((current) => current ?? data.events?.[0]?.id ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void loadEvents());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stage]);

  return (
    <main className="min-h-screen bg-[#09090f] text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5">
        <header className="flex shrink-0 flex-col gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
              title="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {userEmail ?? "Admin"}
              </div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Observabilidad interna
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={loadEvents}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 py-5 lg:grid-cols-[420px_1fr]">
          <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="shrink-0 border-b border-white/[0.06] p-3">
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <label className="relative block">
                  <Filter className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-white/[0.06] bg-[#0d0d14] pl-9 pr-3 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option || "all"} value={option}>
                        {option || "Todos"}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  value={stage}
                  onChange={(event) => setStage(event.target.value)}
                  className="h-9 rounded-lg border border-white/[0.06] bg-[#0d0d14] px-3 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option || "all"} value={option}>
                      {option || "Todas las etapas"}
                    </option>
                  ))}
                </select>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar request, CV, análisis o error"
                  className="h-9 w-full rounded-lg border border-white/[0.06] bg-[#0d0d14] pl-9 pr-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {error && (
                <div className="mb-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
              {filteredEvents.length === 0 ? (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center text-zinc-500">
                  <Activity className="h-7 w-7" />
                  <p className="text-sm">Sin eventos para esos filtros.</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                      selectedEvent?.id === event.id
                        ? "border-indigo-500/40 bg-indigo-500/10"
                        : "border-white/[0.06] bg-[#101018] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <StatusBadge status={event.status} />
                      <span className="shrink-0 text-[11px] text-zinc-500">
                        {formatTime(event.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {event.stage}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {event.source || "sin fuente"} · {event.request_id}
                    </p>
                    {event.error_code && (
                      <p className="mt-2 truncate text-xs text-rose-300">
                        {event.error_code}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="min-h-[520px] overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
            {selectedEvent ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b border-white/[0.06] p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedEvent.status} />
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-xs text-zinc-400">
                      {selectedEvent.stage}
                    </span>
                    {selectedEvent.source && (
                      <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-xs text-zinc-400">
                        {selectedEvent.source}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 text-xs text-zinc-500 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Request" value={selectedEvent.request_id} />
                    <Metric label="CV" value={selectedEvent.cv_id ?? "-"} />
                    <Metric
                      label="Análisis"
                      value={selectedEvent.analysis_id ?? "-"}
                    />
                    <Metric
                      label="Duración"
                      value={
                        selectedEvent.duration_ms === null
                          ? "-"
                          : `${selectedEvent.duration_ms} ms`
                      }
                    />
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_340px]">
                  <div className="min-h-0 overflow-y-auto p-5">
                    <h2 className="mb-4 text-sm font-semibold text-zinc-300">
                      Timeline del intento
                    </h2>
                    <ol className="relative space-y-3 border-l border-white/[0.08] pl-4">
                      {timelineEvents.map((event) => (
                        <li key={event.id} className="relative">
                          <span
                            className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border ${
                              event.status === "error"
                                ? "border-rose-300 bg-rose-500"
                                : event.status === "warning"
                                  ? "border-amber-300 bg-amber-500"
                                  : event.status === "success"
                                    ? "border-emerald-300 bg-emerald-500"
                                    : "border-sky-300 bg-sky-500"
                            }`}
                          />
                          <div className="rounded-lg border border-white/[0.06] bg-[#101018] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-zinc-100">
                                  {event.stage}
                                  {event.source ? ` · ${event.source}` : ""}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {formatDateTime(event.created_at)}
                                </p>
                              </div>
                              <StatusBadge status={event.status} />
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                              <span>
                                Texto: {event.text_length ?? "-"}
                              </span>
                              <span>
                                Archivo: {formatBytes(event.file_size)}
                              </span>
                              <span>
                                {event.duration_ms === null
                                  ? "Duración: -"
                                  : `Duración: ${event.duration_ms} ms`}
                              </span>
                            </div>
                            {(event.error_code || event.error_message) && (
                              <div className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-200">
                                <p className="font-medium">
                                  {event.error_code ?? "error"}
                                </p>
                                {event.error_message && (
                                  <p className="mt-1 text-rose-100/80">
                                    {event.error_message}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <aside className="min-h-0 overflow-y-auto border-t border-white/[0.06] p-5 lg:border-l lg:border-t-0">
                    <h2 className="mb-4 text-sm font-semibold text-zinc-300">
                      Metadatos
                    </h2>
                    <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#08080d] p-3 text-xs leading-5 text-zinc-400">
                      {JSON.stringify(selectedEvent.metadata ?? {}, null, 2)}
                    </pre>
                  </aside>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-zinc-500">
                Selecciona un evento.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: ProcessingEventStatus }) {
  const Icon = statusIcon[status];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium ${statusStyle[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-[#101018] p-3">
      <p className="mb-1 text-[11px] uppercase text-zinc-600">{label}</p>
      <p className="truncate font-mono text-[11px] text-zinc-300">{value}</p>
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function formatBytes(value: number | null) {
  if (value === null) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
