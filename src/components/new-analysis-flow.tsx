"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AIContext, AnalysisMode, CVSummary } from "@/lib/db";

interface NewAnalysisFlowProps {
  cvs: CVSummary[];
  onCVCreated: () => void;
  onAnalysisCreated: (analysisId: string) => void;
}

type CVSource = "existing" | "upload";

export default function NewAnalysisFlow({
  cvs,
  onCVCreated,
  onAnalysisCreated,
}: NewAnalysisFlowProps) {
  const [source, setSource] = useState<CVSource>(cvs.length > 0 ? "existing" : "upload");
  const [selectedCvId, setSelectedCvId] = useState(cvs[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [cvName, setCvName] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("general");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv.id === selectedCvId) ?? null,
    [cvs, selectedCvId]
  );

  const handleFile = (nextFile: File) => {
    if (nextFile.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      return;
    }
    setFile(nextFile);
    setCvName((current) => current || nextFile.name.replace(/\.pdf$/i, ""));
    setError(null);
  };

  const uploadCV = async () => {
    if (!file) throw new Error("Selecciona un CV en PDF.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", cvName.trim() || file.name.replace(/\.pdf$/i, ""));

    const res = await fetch("/api/cvs", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.details || "Error al subir el CV");
    }
    onCVCreated();
    return data.id as string;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Ponle nombre al análisis para poder diferenciarlo.");
      return;
    }
    if (source === "existing" && !selectedCvId) {
      setError("Selecciona un CV existente o sube uno nuevo.");
      return;
    }
    if (source === "upload" && !file) {
      setError("Selecciona un CV en PDF.");
      return;
    }
    if (mode === "job_match" && !jobDescription.trim()) {
      setError("Pega la descripción de la oferta para analizar el match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cvId = source === "upload" ? await uploadCV() : selectedCvId;
      const context: AIContext = {};
      if (additionalContext.trim()) {
        context.additionalContext = additionalContext.trim();
      }

      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvId,
          title: title.trim(),
          mode,
          model: selectedModel,
          context,
          jobDescription: jobDescription.trim() || undefined,
          jobUrl: jobUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Error creando análisis");
      }

      onAnalysisCreated(data.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
            <Zap className="h-3.5 w-3.5" />
            Nuevo análisis
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">
            Elige un CV y define qué quieres analizar
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Puedes reutilizar una versión ya subida o añadir una nueva antes de
            lanzar el análisis.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSource("existing")}
            disabled={cvs.length === 0}
            className={`rounded-xl border p-5 text-left transition-all ${
              source === "existing"
                ? "border-indigo-500/40 bg-indigo-500/10 text-zinc-100"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
            } ${cvs.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <FileText className="mb-4 h-6 w-6 text-indigo-300" />
            <p className="font-semibold">Usar CV existente</p>
            <p className="mt-1 text-sm text-zinc-500">
              {cvs.length} versiones disponibles en tu biblioteca.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`rounded-xl border p-5 text-left transition-all ${
              source === "upload"
                ? "border-emerald-500/40 bg-emerald-500/10 text-zinc-100"
                : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            <UploadCloud className="mb-4 h-6 w-6 text-emerald-300" />
            <p className="font-semibold">Subir nuevo CV</p>
            <p className="mt-1 text-sm text-zinc-500">
              Se guardará como una versión reutilizable.
            </p>
          </button>
        </section>

        {source === "existing" ? (
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <FileText className="h-4 w-4" />
              CV
            </label>
            <div className="relative">
              <select
                value={selectedCvId}
                onChange={(event) => setSelectedCvId(event.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-indigo-500/40 focus:outline-none"
              >
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name} · {cv.filename}
                  </option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 rotate-90 text-zinc-500" />
            </div>
            {selectedCv && (
              <p className="mt-2 text-xs text-zinc-600">
                PDF original: {selectedCv.filename}
              </p>
            )}
          </section>
        ) : (
          <section className="grid gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:grid-cols-[1fr_260px]">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const droppedFile = event.dataTransfer.files[0];
                if (droppedFile) handleFile(droppedFile);
              }}
              className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                file
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : dragActive
                    ? "border-emerald-400/60 bg-emerald-500/10"
                    : "border-zinc-800/70 hover:border-zinc-700"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  if (nextFile) handleFile(nextFile);
                }}
              />
              {file ? (
                <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-300" />
              ) : (
                <UploadCloud className="mb-3 h-8 w-8 text-zinc-500" />
              )}
              <p className="font-medium text-zinc-200">
                {file ? file.name : "Arrastra tu PDF aquí"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "o haz click para seleccionar"}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Nombre para este CV
              </label>
              <input
                value={cvName}
                onChange={(event) => setCvName(event.target.value)}
                placeholder="CV Frontend Abril"
                className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none"
              />
            </div>
          </section>
        )}

        <section className="grid gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:grid-cols-[1fr_260px]">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Nombre del análisis
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Frontend React - Factorial"
              className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <Cpu className="h-4 w-4" />
              Modelo
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-indigo-500/40 focus:outline-none"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 rotate-90 text-zinc-500" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("general")}
              className={`rounded-xl border p-4 text-left transition-all ${
                mode === "general"
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-100"
                  : "border-white/[0.06] bg-[#0a0a12] text-zinc-400"
              }`}
            >
              <Sparkles className="mb-3 h-5 w-5" />
              <p className="font-semibold">Análisis general del CV</p>
              <p className="mt-1 text-sm text-zinc-500">
                Calidad, ATS, estructura y mejoras generales.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("job_match")}
              className={`rounded-xl border p-4 text-left transition-all ${
                mode === "job_match"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  : "border-white/[0.06] bg-[#0a0a12] text-zinc-400"
              }`}
            >
              <Briefcase className="mb-3 h-5 w-5" />
              <p className="font-semibold">Análisis contra oferta</p>
              <p className="mt-1 text-sm text-zinc-500">
                Match, keywords, datos clave y gaps.
              </p>
            </button>
          </div>

          {mode === "general" ? (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
                <MessageSquare className="h-4 w-4" />
                Contexto adicional
              </label>
              <textarea
                value={additionalContext}
                onChange={(event) => setAdditionalContext(event.target.value)}
                placeholder="Ej: busco transición a roles de producto, quiero destacar liderazgo técnico..."
                className="h-28 w-full resize-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  URL de la oferta
                </label>
                <input
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Descripción de la oferta
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Pega aquí la oferta completa..."
                  className="h-56 w-full resize-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-sm font-semibold text-white shadow-xl shadow-indigo-900/30 transition-all hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creando análisis...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Lanzar análisis
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
