"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  FileText,
  KeyRound,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type {
  CVRecommendationAnalysis,
  CVSummary,
} from "@/lib/db";
import { getCVTemplate, type CVTemplateLocale } from "@/lib/cv-templates";
import { getErrorMessage } from "@/lib/errors";
import CVTemplatePreview from "@/components/cv-template-preview";
import { Button } from "@/components/ui/button";

interface CVEditorViewProps {
  cvs: CVSummary[];
  hasOriginalCVs: boolean;
  activeVersionId: string | null;
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onStartAnalysis: () => void;
  onCVUpdated: () => void;
  onBackToLibrary?: () => void;
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
  cvs,
  hasOriginalCVs,
  activeVersionId,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenTemplates,
  onOpenSettings,
  onStartAnalysis,
  onCVUpdated,
  onBackToLibrary,
}: CVEditorViewProps) {
  const [zoom, setZoom] = useState(0.85);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savingAsCv, setSavingAsCv] = useState(false);
  const [manuallySelectedVersionId, setManuallySelectedVersionId] = useState<string | null>(null);
  const [editedVersion, setEditedVersion] = useState<CVSummary | null>(null);
  const [recommendationAnalysis, setRecommendationAnalysis] = useState<CVRecommendationAnalysis | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-pro-preview");
  const [editInstruction, setEditInstruction] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentVersionId = manuallySelectedVersionId ?? activeVersionId;
  const currentVersionFromList = useMemo(() =>
    currentVersionId ? cvs.find(v => v.id === currentVersionId) ?? null : null
  , [cvs, currentVersionId]);

  const currentVersion = editedVersion?.id === currentVersionFromList?.id ? editedVersion : currentVersionFromList;
  const activeTemplate = currentVersion?.template_id ? getCVTemplate(currentVersion.template_id) : null;
  const locale = (currentVersion?.template_locale ?? "es") as CVTemplateLocale;

  useEffect(() => {
    if (!currentVersion?.source_cv_id) return;

    let cancelled = false;
    fetch(`/api/cvs/${currentVersion.source_cv_id}/recommendations`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return null;
        return data.analysis ?? null;
      })
      .then((nextRecommendation) => {
        if (cancelled) return;
        setRecommendationAnalysis(nextRecommendation);
      })
      .catch(() => {
        // silent error for recommendations
      });

    return () => {
      cancelled = true;
    };
  }, [currentVersion?.source_cv_id]);

  const handleSaveAsCV = async () => {
    if (!currentVersion?.id || !saveName.trim()) return;
    setSavingAsCv(true);
    try {
      const res = await fetch(`/api/cvs/${currentVersion.id}/save-as-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim() }),
      });
      if (!res.ok) throw new Error("Error al guardar como CV");
      setIsSavingModalOpen(false);
      onCVUpdated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingAsCv(false);
    }
  };

  const applyInstruction = async (instruction = editInstruction) => {
    if (!currentVersion?.id) return;
    if (!hasGeminiApiKey) {
      setError("Configura tu API key de Gemini antes de editar.");
      return;
    }
    if (!instruction.trim()) return;

    setEditingProfile(true);
    setError(null);
    try {
      const res = await fetch(`/api/cvs/${currentVersion.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey,
          model: selectedModel,
          instruction: instruction.trim(),
        }),
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from edit API:", text);
        throw new Error(`El servidor devolvió un error inesperado (Status: ${res.status}). Puede ser un timeout o un error de conexión.`);
      }

      if (!res.ok) {
        throw new Error(data.error || data.details || "No se pudo editar el CV");
      }
      setEditedVersion(data.version);
      setEditInstruction("");
      onCVUpdated();
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
      const res = await fetch(`/api/cvs/${currentVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_locale: nextLocale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar idioma");
      setEditedVersion(data.version);
      onCVUpdated();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSavingLocale(false);
    }
  };

  if (!currentVersion || !activeTemplate) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#050509] p-10 text-center overflow-y-auto">
        <div className="max-w-3xl w-full">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <LayoutTemplate className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Selecciona un CV para editar</h2>
          <p className="text-zinc-500 mb-8">
            Elige uno de los CVs basados en plantillas para comenzar a editarlo con IA.
          </p>
          
          {cvs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {cvs.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => setManuallySelectedVersionId(cv.id)}
                  className="flex flex-col items-start rounded-xl border border-white/5 bg-white/5 p-4 hover:border-teal-500/30 hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold text-white truncate w-full">{cv.name}</span>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                      {getCVTemplate(cv.template_id!)?.name || cv.template_id}
                    </span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                      {cv.template_locale}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 mx-auto max-w-md">
              <p className="text-zinc-500 mb-6">No tienes ningún CV en formato plantilla.</p>
              <Button onClick={onOpenTemplates} className="bg-teal-500 text-black hover:bg-teal-400">
                Ir al catálogo de plantillas
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#050509]">
      {/* Topbar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#0a0a12]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBackToLibrary} className="h-8 w-8 text-zinc-400">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-white">{currentVersion.name}</h2>
              <span className="text-[10px] text-zinc-600">basado en</span>
              <span className="truncate text-[11px] font-medium text-teal-500/80 italic">
CV Original
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 uppercase tracking-wider">{activeTemplate.name}</span>
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 uppercase tracking-wider">{locale}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setSaveName(`${currentVersion.name} (Editado)`);
              setIsSavingModalOpen(true);
            }}
            variant="ghost"
            className="h-9 gap-2 border border-teal-500/20 bg-teal-500/5 text-xs text-teal-400 hover:bg-teal-500/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guardar nueva versión</span>          </Button>

          <div className="hidden h-4 w-[1px] bg-white/10 md:block" />

          {/* Zoom Controls */}
          <div className="hidden items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-1 md:flex">
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="h-7 w-7 text-zinc-400">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[40px] text-center text-[11px] font-medium text-zinc-400">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="h-7 w-7 text-zinc-400">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(0.85)} className="ml-1 h-7 w-7 text-zinc-500">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          <div className="hidden h-4 w-[1px] bg-white/10 md:block" />

          <a
            href={`/api/cvs/${currentVersion.id}/template-pdf`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/5 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Descargar PDF</span>
            <span className="sm:hidden">PDF</span>
          </a>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`h-9 w-9 transition-colors ${isPanelOpen ? "text-teal-400" : "text-zinc-500"}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="relative flex-1 overflow-auto bg-[#050509] scrollbar-thin">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          
          <div className="flex min-h-full min-w-full items-center justify-center p-10 md:p-20">
            <motion.div
              style={{ scale: zoom }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative shadow-[0_0_80px_rgba(0,0,0,0.5)] origin-center"
            >
              <div className="w-[820px] overflow-hidden rounded-sm bg-white ring-1 ring-white/10">
                {currentVersion.profile ? (
                  <CVTemplatePreview
                    profile={currentVersion.profile}
                    templateId={activeTemplate.templateId}
                    locale={locale}
                  />
                ) : (
                  <div className="flex aspect-[1/1.41] items-center justify-center bg-zinc-900 text-zinc-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.aside
              initial={{ x: 380 }}
              animate={{ x: 0 }}
              exit={{ x: 380 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-30 w-[380px] border-l border-white/5 bg-[#0a0a12]/95 backdrop-blur-xl md:relative"
            >
              <div className="flex h-full flex-col overflow-y-auto p-6 scrollbar-thin">
                <div className="space-y-8">
                  {/* IA Section */}
                  <section>
                    <header className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Editor IA</h3>
                      </div>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-transparent text-[11px] font-medium text-zinc-500 focus:outline-none cursor-pointer"
                      >
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      </select>
                    </header>

                    {error && (
                      <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="Describe los cambios que quieres hacer..."
                          className="h-32 w-full resize-none rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-teal-500/30 focus:outline-none transition-colors"
                        />
                        <Button
                          disabled={!editInstruction.trim() || editingProfile || !hasGeminiApiKey}
                          onClick={() => applyInstruction()}
                          className="absolute bottom-3 right-3 h-8 rounded-lg bg-teal-500 px-3 text-xs font-bold text-black hover:bg-teal-400 disabled:opacity-30"
                        >
                          {editingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[
                          "Acorta el Sobre mí",
                          "Mejora claridad",
                          "Hazlo más ejecutivo",
                          "Corregir erratas",
                        ].map((hint) => (
                          <button
                            key={hint}
                            onClick={() => {
                              setEditInstruction(hint);
                              void applyInstruction(hint);
                            }}
                            className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[11px] text-zinc-400 hover:border-white/10 hover:bg-white/10 hover:text-zinc-200 transition-colors"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Recommendations Section */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Recomendaciones</h3>
                      </div>
                      {recommendationAnalysis?.ai_score && (
                        <span className="text-xs font-bold text-amber-500">{recommendationAnalysis.ai_score}/100</span>
                      )}
                    </div>

                    {recommendationAnalysis ? (
                      <div className="space-y-3">
                        {safeParseArray(recommendationAnalysis.ai_improvements).slice(0, 3).map((imp, i) => (
                          <div key={i} className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/40" />
                            <p>{imp}</p>
                          </div>
                        ))}
                        {safeParseArray(recommendationAnalysis.missing_keywords).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {safeParseArray(recommendationAnalysis.missing_keywords).slice(0, 5).map((k) => (
                              <span key={k} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-zinc-500 mb-3">No hay análisis para este CV</p>
                        <Button variant="outline" size="sm" onClick={onStartAnalysis} className="h-8 text-[11px] border-white/10 text-zinc-400 hover:text-white">
                          Analizar ahora
                        </Button>
                      </div>
                    )}
                  </section>

                  {/* Settings Section */}
                  <section className="pt-4 border-t border-white/5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600">Configuración</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Idioma del CV</span>
                        <div className="flex gap-1 rounded-lg border border-white/5 p-1 bg-white/5">
                          {(["es", "en"] as const).map((l) => (
                            <button
                              key={l}
                              onClick={() => updateLocale(l)}
                              disabled={savingLocale}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                                locale === l ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Diseño</span>
                        <Button variant="link" onClick={onOpenTemplates} className="h-auto p-0 text-xs text-teal-400">
                          Cambiar plantilla
                        </Button>
                      </div>
                    </div>
                  </section>

                  {!hasGeminiApiKey && (
                    <Button variant="secondary" onClick={onOpenSettings} className="w-full h-10 text-xs bg-amber-500 text-black hover:bg-amber-400">
                      <KeyRound className="mr-2 h-3.5 w-3.5" />
                      Configurar API Key
                    </Button>
                  )}
                </div>

                <div className="mt-auto pt-10">
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Estás editando una versión derivada. El archivo original y su extracción se mantienen intactos.
                  </p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSavingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a0a12] p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white">Guardar en biblioteca</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Se creará un nuevo CV en tu biblioteca con los cambios actuales.
              </p>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Nombre del CV</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-teal-500/50 focus:outline-none"
                    placeholder="Ej: Mi CV - Versión IA"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsSavingModalOpen(false)}
                    className="flex-1 text-zinc-400 hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveAsCV}
                    disabled={!saveName.trim() || savingAsCv}
                    className="flex-1 bg-teal-500 text-black hover:bg-teal-400"
                  >
                    {savingAsCv ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
