"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutTemplate,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { CVSummary } from "@/lib/db";
import {
  CV_TEMPLATES,
  type CVTemplateId,
  type CVTemplateLocale,
} from "@/lib/cv-templates";
import CVTemplatePreview from "@/components/cv-template-preview";

interface TemplatesViewProps {
  cvs: CVSummary[];
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  onOpenSettings: () => void;
  onOpenEditor: (cvId: string) => void;
  onCVUpdated: () => void;
}

export default function TemplatesView({
  cvs,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenSettings,
  onOpenEditor,
  onCVUpdated,
}: TemplatesViewProps) {
  const [selectedCvId, setSelectedCvId] = useState(cvs[0]?.id ?? "");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<CVTemplateId>("compact");
  const [locale, setLocale] = useState<CVTemplateLocale>("es");
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCv = useMemo(
    () => cvs.find((cv) => cv.id === selectedCvId) ?? cvs[0] ?? null,
    [cvs, selectedCvId]
  );
  const activeCvId = selectedCv?.id ?? "";
  const selectedTemplate = useMemo(
    () =>
      CV_TEMPLATES.find(
        (template) => template.templateId === selectedTemplateId
      ) ?? CV_TEMPLATES[0],
    [selectedTemplateId]
  );

  const selectTemplate = async (templateId = selectedTemplate.templateId) => {
    if (!activeCvId) {
      setError("Selecciona un CV antes de elegir plantilla.");
      return;
    }
    setSelecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cvs/${activeCvId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          locale,
          geminiApiKey,
          model: "gemini-2.5-flash",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.details || "No se pudo seleccionar la plantilla"
        );
      }
      onCVUpdated();
      onOpenEditor(data.version.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[420px_1fr]"
      >
        <section className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Plantillas
            </div>
            <h1 className="mt-3 text-3xl font-bold text-zinc-100">
              Elige la base visual de tu CV editable
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              Al seleccionar una plantilla se crea o reutiliza la versión
              estructurada editable. El PDF original queda intacto para futuras
              comparaciones.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <FileText className="h-4 w-4" />
              CV de origen
            </label>
            <div className="relative">
              <select
                value={activeCvId}
                onChange={(event) => setSelectedCvId(event.target.value)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-teal-500/40 focus:outline-none"
              >
                {cvs.length === 0 ? (
                  <option value="">No hay CVs guardados</option>
                ) : (
                  cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name} · {cv.filename}
                    </option>
                  ))
                )}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 rotate-90 text-zinc-500" />
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="mb-2 block text-sm text-zinc-400">Idioma</label>
            <select
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as CVTemplateLocale)
              }
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#0a0a12] px-4 text-sm text-zinc-200 focus:border-teal-500/40 focus:outline-none"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </section>

          {!hasGeminiApiKey && (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-100">
                Hace falta tu API key de Gemini para estructurar el CV la primera
                vez que eliges una plantilla.
              </p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-amber-400 px-3 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Configurar API key
              </button>
            </section>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {CV_TEMPLATES.map((template) => (
            <button
              key={template.templateId}
              type="button"
              onClick={() => {
                setSelectedTemplateId(template.templateId);
                void selectTemplate(template.templateId);
              }}
              disabled={!activeCvId || selecting}
              className={`group rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedTemplateId === template.templateId
                  ? "border-teal-400/40 bg-teal-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="h-[520px] overflow-hidden rounded-lg bg-zinc-100 p-3">
                <CVTemplatePreview
                  profile={template.fixtureProfile}
                  templateId={template.templateId}
                  locale={locale}
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-100">{template.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {template.description}
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                  {selecting && selectedTemplateId === template.templateId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedTemplateId === template.templateId ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </span>
              </div>
            </button>
          ))}
        </section>
      </motion.div>
    </div>
  );
}
