"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AnalysisSummary, CVSummary } from "@/lib/db";

interface CVLibraryProps {
  cvs: CVSummary[];
  analyses: AnalysisSummary[];
  onRefresh: () => void;
  onOpenAnalysis: (id: string) => void;
  onOpenEditor: (cvId: string) => void;
}

export default function CVLibrary({
  cvs,
  analyses,
  onRefresh,
  onOpenAnalysis,
  onOpenEditor,
}: CVLibraryProps) {
  const [selectedId, setSelectedId] = useState(cvs[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingAnalyses, setBlockingAnalyses] = useState<AnalysisSummary[]>(
    []
  );

  const selected = useMemo(
    () => cvs.find((cv) => cv.id === selectedId) ?? cvs[0] ?? null,
    [cvs, selectedId]
  );

  const analysesByCv = useMemo(() => {
    const grouped = new Map<string, AnalysisSummary[]>();
    for (const analysis of analyses) {
      if (!analysis.cv_id) continue;
      const existing = grouped.get(analysis.cv_id) ?? [];
      existing.push(analysis);
      grouped.set(analysis.cv_id, existing);
    }
    return grouped;
  }, [analyses]);

  const selectedAnalyses = useMemo(
    () => (selected ? (analysesByCv.get(selected.id) ?? []) : []),
    [analysesByCv, selected]
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setDraftName(name);
    setError(null);
  };

  const saveName = async (id: string) => {
    if (!draftName.trim()) return;
    setLoadingId(id);
    setError(null);
    setBlockingAnalyses([]);
    try {
      const res = await fetch(`/api/cvs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo renombrar el CV");
      setEditingId(null);
      onRefresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingId(null);
    }
  };

  const deleteCv = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este CV?")) return;
    setLoadingId(id);
    setError(null);
    setBlockingAnalyses([]);
    try {
      const res = await fetch(`/api/cvs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data.analyses)) {
          setBlockingAnalyses(data.analyses);
        }
        throw new Error(data.error || "No se pudo borrar el CV");
      }
      if (selectedId === id) setSelectedId("");
      onRefresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid h-full w-full gap-6 lg:grid-cols-[360px_1fr]"
      >
        <section className="flex min-h-0 flex-col">
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300">
              <FileText className="h-3.5 w-3.5" />
              Mis CVs
            </div>
            <h1 className="mt-3 text-3xl font-bold text-zinc-100">
              Versiones guardadas
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Gestiona los CVs que puedes usar en futuros análisis.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <p>{error}</p>
              {blockingAnalyses.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-rose-500/20 pt-3">
                  <p className="text-xs font-semibold text-rose-200">
                    Análisis asociados
                  </p>
                  {blockingAnalyses.map((analysis) => (
                    <a
                      key={analysis.id}
                      href={`/?analysis=${encodeURIComponent(analysis.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0a0a12]/70 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-100"
                    >
                      <FileSearch className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                      <span className="min-w-0 flex-1 truncate">
                        {analysis.title ||
                          analysis.filename.replace(/\.pdf$/i, "")}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
            {cvs.length === 0 ? (
              <div className="flex h-full min-h-56 flex-col items-center justify-center text-center text-zinc-600">
                <FileText className="mb-3 h-8 w-8" />
                <p className="text-sm">Todavía no hay CVs guardados.</p>
              </div>
            ) : (
              cvs.map((cv) => (
                <div
                  key={cv.id}
                  className={`group mb-1 rounded-lg border p-3 transition-all ${
                    selected?.id === cv.id
                      ? "border-sky-500/30 bg-sky-500/10"
                      : "border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(cv.id)}
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-400"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingId === cv.id ? (
                        <input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0a0a12] px-3 text-sm text-zinc-100 focus:border-sky-500/40 focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedId(cv.id)}
                          className="block w-full truncate text-left text-sm font-semibold text-zinc-100"
                        >
                          {cv.name}
                        </button>
                      )}
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {cv.filename}
                      </p>
                      {Boolean(analysesByCv.get(cv.id)?.length) && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-sky-500/15 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          <FileSearch className="h-3 w-3" />
                          {analysesByCv.get(cv.id)?.length} análisis
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {editingId === cv.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveName(cv.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            {loadingId === cv.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(cv.id, cv.name)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCv(cv.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            {loadingId === cv.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          {selected ? (
            <div className="flex h-full min-h-[520px] flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {selected.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {selected.filename}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selected.type === "template" && (
                    <a
                      href={`/?view=editor&cv=${encodeURIComponent(selected.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-500/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar con IA
                    </a>
                  )}
                  <a
                    href={`/api/cvs/${selected.id}/${selected.type === "template" ? "template-pdf" : "pdf"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                    title="Ver PDF"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="mb-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Pencil className="h-3.5 w-3.5 text-teal-300" />
                    Versiones con plantilla
                  </p>
                  {cvs.filter((c) => c.type === "template" && c.source_cv_id === selected.id)
                    .length > 0 ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {cvs
                        .filter((c) => c.type === "template" && c.source_cv_id === selected.id)
                        .map((tpl) => (
                          <a
                            key={tpl.id}
                            href={`/?view=editor&cv=${encodeURIComponent(tpl.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-teal-500/15 bg-teal-500/10 px-3 py-2 text-left text-xs font-semibold text-teal-200 hover:bg-teal-500/20"
                          >
                            {tpl.name}
                          </a>
                        ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-white/[0.04] bg-[#0a0a12]/70 px-3 py-2 text-xs text-zinc-600">
                      Aún no hay versiones con plantilla para este CV.
                    </p>
                  )}
                </div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <FileSearch className="h-3.5 w-3.5 text-sky-300" />
                    Análisis asociados
                  </p>
                  <span className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                    {selectedAnalyses.length}
                  </span>
                </div>
                {selectedAnalyses.length > 0 ? (
                  <div className="grid max-h-40 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {selectedAnalyses.map((analysis) => (
                      <a
                        key={analysis.id}
                        href={`/?analysis=${encodeURIComponent(analysis.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.05] bg-[#0a0a12] px-3 py-2 text-left transition-colors hover:border-sky-500/25 hover:bg-sky-500/10"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-500 group-hover:text-sky-300">
                          {analysis.analysis_mode === "job_match" ? (
                            <Briefcase className="h-3.5 w-3.5" />
                          ) : (
                            <FileSearch className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-zinc-200">
                            {analysis.title ||
                              analysis.filename.replace(/\.pdf$/i, "")}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600">
                            <Clock className="h-3 w-3" />
                            {formatDate(analysis.created_at)}
                          </span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-sky-300" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-white/[0.04] bg-[#0a0a12]/70 px-3 py-2 text-xs text-zinc-600">
                    Este CV todavía no tiene análisis asociados.
                  </p>
                )}
              </div>
              <iframe
                src={`/api/cvs/${selected.id}/${selected.type === "template" ? "template-pdf" : "pdf"}#toolbar=0`}
                className="min-h-0 flex-1 bg-zinc-950"
                title="Vista previa del CV"
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-zinc-600">
              Selecciona un CV para previsualizarlo.
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
