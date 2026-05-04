"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Download,
  FileText,
  KeyRound,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Sparkles,
  Wand2,
} from "lucide-react";
import type {
  CVRecommendationAnalysis,
  CVTemplateVersion,
} from "@/lib/db";
import { getCVTemplate, type CVTemplateLocale } from "@/lib/cv-templates";
import { getErrorMessage } from "@/lib/errors";
import CVTemplatePreview from "@/components/cv-template-preview";

interface CVEditorViewProps {
  cvVersions: CVTemplateVersion[];
  hasOriginalCVs: boolean;
  activeVersionId: string | null;
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onStartAnalysis: () => void;
  onCVUpdated: () => void;
}

function safeParseArray(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function CVEditorView({
  cvVersions,
  hasOriginalCVs,
  activeVersionId,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenTemplates,
  onOpenSettings,
  onStartAnalysis,
  onCVUpdated,
}: CVEditorViewProps) {
  const initialCv = useMemo(
    () =>
      cvVersions.find((version) => version.id === activeVersionId) ??
      cvVersions[0] ??
      null,
    [activeVersionId, cvVersions]
  );
  const [manuallySelectedCvId, setManuallySelectedCvId] = useState<
    string | null
  >(null);
  const [editedVersion, setEditedVersion] = useState<CVTemplateVersion | null>(
    null
  );
  const [recommendationAnalysis, setRecommendationAnalysis] =
    useState<CVRecommendationAnalysis | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [editInstruction, setEditInstruction] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVersionId =
    manuallySelectedCvId ?? activeVersionId ?? initialCv?.id ?? "";

  const selectedVersion = useMemo(
    () =>
      cvVersions.find((version) => version.id === selectedVersionId) ??
      initialCv,
    [cvVersions, initialCv, selectedVersionId]
  );
  const activeTemplate = selectedVersion?.template_id
    ? getCVTemplate(selectedVersion.template_id)
    : null;
  const locale = selectedVersion?.template_locale ?? "es";

  const currentVersion =
    editedVersion?.id === selectedVersion?.id ? editedVersion : selectedVersion;

  useEffect(() => {
    if (!selectedVersion?.source_cv_id) return;

    let cancelled = false;
    fetch(`/api/cvs/${selectedVersion.source_cv_id}/recommendations`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) return null;
          return data.analysis ?? null;
        })
        .then((nextRecommendation) => {
        if (cancelled) return;
        setError(null);
        setRecommendationAnalysis(nextRecommendation);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVersion?.source_cv_id]);

  const currentProfile = currentVersion?.profile ?? null;

  const applyInstruction = async (instruction = editInstruction) => {
    if (!currentVersion?.id || !currentProfile) {
      setError("Selecciona una plantilla antes de editar el CV.");
      return;
    }
    if (!hasGeminiApiKey) {
      setError("Configura tu API key de Gemini antes de editar el CV.");
      return;
    }
    if (!instruction.trim()) {
      setError("Escribe una petición para la IA.");
      return;
    }

    setEditingProfile(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/cv-template-versions/${currentVersion.id}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geminiApiKey,
            model: selectedModel,
            instruction: instruction.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "No se pudo editar el CV");
      }
      setEditedVersion(data.version);
      setEditInstruction("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setEditingProfile(false);
    }
  };

  const updateLocale = async (nextLocale: CVTemplateLocale) => {
    if (!currentVersion?.id) return;
    setSavingLocale(true);
    setError(null);
    try {
      const res = await fetch(`/api/cv-template-versions/${currentVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_locale: nextLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "No se pudo cambiar idioma");
      }
      setEditedVersion(data.version);
      onCVUpdated();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSavingLocale(false);
    }
  };

  const currentRecommendation =
    recommendationAnalysis?.cv_id === currentVersion?.source_cv_id
      ? recommendationAnalysis
      : null;
  const improvements = safeParseArray(currentRecommendation?.ai_improvements);
  const missingKeywords = safeParseArray(currentRecommendation?.missing_keywords);

  if (!selectedVersion) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {hasOriginalCVs
              ? "Selecciona una plantilla para crear tu primera versión editable."
              : "Sube un CV para empezar."}
          </p>
          {hasOriginalCVs && (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-teal-400"
            >
              Elegir plantilla
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!activeTemplate) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">
            Selecciona una plantilla para editar
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            El editor trabaja sobre una versión estructurada asociada a una
            plantilla. Tu PDF original seguirá intacto.
          </p>
          <button
            type="button"
            onClick={onOpenTemplates}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-teal-400"
          >
            <LayoutTemplate className="h-4 w-4" />
            Elegir plantilla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto grid h-full w-full max-w-7xl gap-6 xl:grid-cols-[430px_1fr]"
      >
        <section className="min-h-0 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300">
              <Wand2 className="h-3.5 w-3.5" />
              Editor IA
            </div>
            <h1 className="mt-3 text-2xl font-bold text-zinc-100">
              Edita la versión actual
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              El original subido se conserva. Aquí modificas la versión
              estructurada que se exporta con la plantilla.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <label className="block text-sm text-zinc-400">
              <span className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CV actual
              </span>
              <select
                value={selectedVersion.id}
                onChange={(event) => setManuallySelectedCvId(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-teal-500/40 focus:outline-none"
              >
                {cvVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12]/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Plantilla activa
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {activeTemplate.name}
              </p>
              <button
                type="button"
                onClick={onOpenTemplates}
                className="mt-2 text-xs font-semibold text-teal-300 hover:text-teal-200"
              >
                Cambiar plantilla
              </button>
            </div>

            <label className="block text-sm text-zinc-400">
              <span className="mb-2 flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Modelo de IA
              </span>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-teal-500/40 focus:outline-none"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-3.1-pro-preview">
                  Gemini 3.1 Pro Preview
                </option>
              </select>
            </label>

            <label className="block text-sm text-zinc-400">
              <span className="mb-2 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                Petición para la IA
              </span>
              <textarea
                value={editInstruction}
                onChange={(event) => setEditInstruction(event.target.value)}
                placeholder="Ej: Acorta mi Sobre mí a 3 líneas y hazlo más directo."
                className="h-32 w-full resize-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-teal-500/40 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {[
                "Acorta el Sobre mí manteniendo el tono profesional.",
                "Mejora la claridad y elimina repeticiones.",
                "Adapta el contenido usando las recomendaciones disponibles.",
              ].map((instruction) => (
                <button
                  key={instruction}
                  type="button"
                  onClick={() => {
                    setEditInstruction(instruction);
                    void applyInstruction(instruction);
                  }}
                  disabled={editingProfile || !hasGeminiApiKey || !currentProfile}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {instruction.split(".")[0]}
                </button>
              ))}
            </div>

            {!hasGeminiApiKey ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 hover:bg-white"
              >
                <KeyRound className="h-4 w-4" />
                Configurar API key
              </button>
            ) : (
              <button
                type="button"
                onClick={() => applyInstruction()}
                disabled={
                  editingProfile || !editInstruction.trim() || !currentProfile
                }
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Aplicar cambios
              </button>
            )}
          </div>

          <section className="mt-5 rounded-xl border border-white/[0.06] bg-[#0a0a12]/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                Recomendaciones
              </div>
              {currentRecommendation?.ai_score !== null &&
                currentRecommendation?.ai_score !== undefined && (
                  <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                    {currentRecommendation.ai_score}/100
                  </span>
                )}
            </div>
            {currentRecommendation ? (
              <div className="space-y-3">
                {improvements.slice(0, 4).map((item, index) => (
                  <p key={`${item}-${index}`} className="text-sm text-zinc-400">
                    {item}
                  </p>
                ))}
                {missingKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {missingKeywords.slice(0, 8).map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-500">
                  Analiza este CV para traer recomendaciones al editor.
                </p>
                <button
                  type="button"
                  onClick={onStartAnalysis}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Analizar CV
                </button>
              </div>
            )}
          </section>
        </section>

        <section className="min-h-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {currentVersion?.name ?? selectedVersion.name}
              </p>
              <p className="text-xs text-zinc-500">
                Preview editable · original preservado
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={locale}
                onChange={(event) =>
                  void updateLocale(event.target.value as CVTemplateLocale)
                }
                disabled={savingLocale}
                className="h-9 rounded-lg border border-white/[0.06] bg-[#0a0a12] px-3 text-xs text-zinc-200 focus:border-teal-500/40 focus:outline-none disabled:opacity-50"
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
              <a
                href={`/api/cv-template-versions/${currentVersion?.id ?? selectedVersion.id}/pdf`}
                className="flex h-9 items-center gap-2 rounded-lg bg-teal-500 px-3 text-xs font-semibold text-zinc-950 hover:bg-teal-400"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>

          <div className="h-full min-h-[720px] overflow-auto bg-zinc-900/70 p-4">
            {currentProfile ? (
              <div className="mx-auto max-w-[820px]">
                <CVTemplatePreview
                  profile={currentProfile}
                  templateId={activeTemplate.templateId}
                  locale={locale}
                />
              </div>
            ) : (
              <div className="flex min-h-[560px] items-center justify-center text-sm text-zinc-600">
                Cargando versión editable...
              </div>
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
