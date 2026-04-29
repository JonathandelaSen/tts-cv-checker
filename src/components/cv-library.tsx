"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, FileText, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { CVSummary } from "@/lib/db";

interface CVLibraryProps {
  cvs: CVSummary[];
  onRefresh: () => void;
}

export default function CVLibrary({ cvs, onRefresh }: CVLibraryProps) {
  const [selectedId, setSelectedId] = useState(cvs[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => cvs.find((cv) => cv.id === selectedId) ?? cvs[0] ?? null,
    [cvs, selectedId]
  );

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setDraftName(name);
    setError(null);
  };

  const saveName = async (id: string) => {
    if (!draftName.trim()) return;
    setLoadingId(id);
    setError(null);
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
    try {
      const res = await fetch(`/api/cvs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo borrar el CV");
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
        className="mx-auto grid h-full w-full max-w-6xl gap-6 lg:grid-cols-[360px_1fr]"
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
              {error}
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
                <a
                  href={`/api/cvs/${selected.id}/pdf?download=1`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                  title="Descargar PDF"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              <iframe
                src={`/api/cvs/${selected.id}/pdf#toolbar=0`}
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
