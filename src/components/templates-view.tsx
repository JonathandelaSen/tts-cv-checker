"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutTemplate,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { CVSummary } from "@/lib/db";
import {
  CV_TEMPLATES,
  type CVTemplateDefinition,
  type CVTemplateLocale,
} from "@/lib/cv-templates";
import CVTemplatePreview from "@/components/cv-template-preview";
import { Button } from "@/components/ui/button";

interface TemplatesViewProps {
  cvs: CVSummary[];
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  onOpenSettings: () => void;
  onOpenEditor: (versionId: string) => void;
  onOpenUpload: () => void;
  onCVUpdated: () => void;
}

export default function TemplatesView({
  cvs,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenSettings,
  onOpenEditor,
  onOpenUpload,
  onCVUpdated,
}: TemplatesViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplateDefinition | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [locale, setLocale] = useState<CVTemplateLocale>("es");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCvs = cvs.filter(cv => 
    cv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cv.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateVersion = async () => {
    if (!selectedTemplate || !selectedCvId) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/cvs/${selectedCvId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.templateId,
          locale,
          geminiApiKey,
          model: "gemini-2.5-flash", // Using the correct default
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Error al crear la versión");
      }

      onCVUpdated();
      onOpenEditor(data.version.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050509]">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Catálogo de Plantillas
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Elige un diseño para tu nuevo CV
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-zinc-400">
            Selecciona una plantilla profesional y conéctala con uno de tus CVs subidos para empezar a editar con IA.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {CV_TEMPLATES.map((template) => (
            <motion.div
              key={template.templateId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all hover:border-teal-500/30 hover:bg-white/[0.04]"
            >
              <div className="aspect-[3/4] overflow-hidden bg-zinc-900 p-4">
                <div className="h-full w-full origin-top scale-[0.4] overflow-hidden rounded-lg bg-white shadow-2xl transition-transform group-hover:scale-[0.42]">
                  <CVTemplatePreview
                    profile={template.fixtureProfile}
                    templateId={template.templateId}
                    locale="es"
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {template.description}
                </p>
                <div className="mt-auto pt-6">
                  <Button
                    onClick={() => setSelectedTemplate(template)}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                  >
                    Usar esta plantilla
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a12] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 p-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5 text-zinc-400"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Configurar versión</h2>
                    <p className="text-sm text-zinc-500">Conecta {selectedTemplate.name} con un CV</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/5 text-zinc-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-zinc-300">1. Elige tu CV de origen</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar CV..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none"
                      />
                    </div>
                    
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
                      {filteredCvs.length > 0 ? (
                        filteredCvs.map((cv) => (
                          <button
                            key={cv.id}
                            onClick={() => setSelectedCvId(cv.id)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                              selectedCvId === cv.id
                                ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                                : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className={`h-4 w-4 ${selectedCvId === cv.id ? "text-teal-400" : "text-zinc-500"}`} />
                              <span className="text-sm font-medium truncate max-w-[140px]">{cv.name}</span>
                            </div>
                            {selectedCvId === cv.id && <Check className="h-4 w-4" />}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-sm text-zinc-500">No tienes CVs subidos</p>
                          <Button
                            variant="link"
                            className="mt-2 text-teal-400"
                            onClick={onOpenUpload}
                          >
                            <Plus className="mr-2 h-4 w-4" /> Subir mi primer CV
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-zinc-300">2. Idioma de salida</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["es", "en"] as const).map((l) => (
                          <button
                            key={l}
                            onClick={() => setLocale(l)}
                            className={`flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-all ${
                              locale === l
                                ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                                : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:bg-white/5"
                            }`}
                          >
                            {l === "es" ? "Español" : "English"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!hasGeminiApiKey && selectedCvId && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <div className="flex gap-3">
                          <KeyRound className="h-5 w-5 shrink-0 text-amber-400" />
                          <div>
                            <p className="text-xs leading-relaxed text-amber-200">
                              Necesitas configurar tu API Key para que la IA pueda procesar tu CV por primera vez.
                            </p>
                            <Button
                              variant="link"
                              className="h-auto p-0 mt-2 text-xs font-bold text-amber-400 hover:text-amber-300"
                              onClick={onOpenSettings}
                            >
                              Configurar ahora
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4">
                      <Button
                        disabled={!selectedCvId || creating}
                        onClick={handleCreateVersion}
                        className="w-full h-12 bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Estructurando CV...
                          </>
                        ) : (
                          <>
                            Crear Versión Editable
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
