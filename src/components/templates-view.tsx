"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Download,
  FileText,
  KeyRound,
  LayoutTemplate,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { CVStructuredProfile, CVSummary } from "@/lib/db";
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
}

export default function TemplatesView({
  cvs,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenSettings,
}: TemplatesViewProps) {
  const [selectedCvId, setSelectedCvId] = useState(cvs[0]?.id ?? "");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<CVTemplateId>("compact");
  const [locale, setLocale] = useState<CVTemplateLocale>("es");
  const [profile, setProfile] = useState<CVStructuredProfile | null>(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);
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

  useEffect(() => {
    if (!activeCvId) {
      return;
    }

    let cancelled = false;
    fetch(`/api/cvs/${activeCvId}/structured-profile`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error || "No se pudo cargar el perfil estructurado"
          );
        }
        return data.profile ?? null;
      })
      .then((nextProfile) => {
        if (cancelled) return;
        setError(null);
        setProfile(nextProfile);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCvId]);

  const generateProfile = async (force = false) => {
    if (!activeCvId) {
      setError("Selecciona un CV para usar una plantilla.");
      return;
    }
    if (!hasGeminiApiKey) {
      setError("Configura tu API key de Gemini antes de estructurar el CV.");
      return;
    }

    setGeneratingProfile(true);
    setError(null);
    try {
      const res = await fetch(`/api/cvs/${activeCvId}/structured-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey,
          model: "gemini-2.5-flash",
          force,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "No se pudo estructurar el CV");
      }
      setProfile(data.profile);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingProfile(false);
    }
  };

  const selectTemplate = (templateId: CVTemplateId) => {
    setSelectedTemplateId(templateId);
  };

  const pdfHref =
    selectedCv && profile
      ? `/api/cvs/${selectedCv.id}/templates/${selectedTemplate.templateId}/pdf?locale=${locale}`
      : "";

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
              Convierte tu CV en una versión lista para ATS
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              Elige una plantilla. La primera selección estructura el CV con IA;
              después puedes cambiar de diseño sin consumir otra llamada.
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

          <section className="grid gap-3">
            {CV_TEMPLATES.map((template) => (
              <button
                key={template.templateId}
                type="button"
                onClick={() => selectTemplate(template.templateId)}
                className={`group rounded-xl border p-3 text-left transition-all ${
                  selectedTemplate.templateId === template.templateId
                    ? "border-teal-400/40 bg-teal-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div className="h-44 overflow-hidden rounded-lg bg-zinc-100 p-2">
                    <CVTemplatePreview
                      profile={template.fixtureProfile}
                      templateId={template.templateId}
                      locale={locale}
                      scale="card"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-100">
                          {template.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate.templateId === template.templateId && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-xs text-zinc-600">
                      Preview con datos lorem ipsum. Al seleccionarla se usará
                      la información real del CV.
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        </section>

        <section className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {selectedTemplate.name}
              </p>
              <p className="text-xs text-zinc-500">
                {profile ? "Datos reales del CV" : "Esperando perfil estructurado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value as CVTemplateLocale)
                }
                className="h-9 rounded-lg border border-white/[0.06] bg-[#0a0a12] px-3 text-xs text-zinc-200 focus:border-teal-500/40 focus:outline-none"
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
              <button
                type="button"
                onClick={() => generateProfile(true)}
                disabled={!selectedCv || generatingProfile}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                title="Regenerar JSON estándar"
              >
                {generatingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
              <a
                href={pdfHref || undefined}
                aria-disabled={!pdfHref}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  pdfHref
                    ? "bg-teal-500 text-zinc-950 hover:bg-teal-400"
                    : "pointer-events-none bg-zinc-800 text-zinc-600"
                }`}
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            </div>
          </div>

          <div className="min-h-[720px] overflow-auto bg-zinc-900/70 p-4">
            {profile ? (
              <div className="mx-auto max-w-[820px]">
                <CVTemplatePreview
                  profile={profile.profile}
                  templateId={selectedTemplate.templateId}
                  locale={locale}
                />
              </div>
            ) : (
              <div className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  Estructura este CV para usar plantillas
                </h2>
                <p className="mt-2 max-w-md text-sm text-zinc-500">
                  Se creará un JSON estándar reutilizable. Cambiar de plantilla
                  después usará esta misma estructura.
                </p>
                <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  Se usará la API de Gemini configurada para procesar el CV.
                </div>
                {hasGeminiApiKey ? (
                  <button
                    type="button"
                    onClick={() => generateProfile(false)}
                    disabled={!selectedCv || generatingProfile}
                    className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-teal-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Estructurar CV
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 hover:bg-white"
                  >
                    <KeyRound className="h-4 w-4" />
                    Configurar API key
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
