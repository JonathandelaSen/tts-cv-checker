"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Cpu,
  ChevronRight,
  MessageSquare,
  KeyRound,
} from "lucide-react";
import type { AIContext } from "@/lib/db";

interface GeneralAnalysisFormProps {
  onSubmit: (context: AIContext, model: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  hasGeminiApiKey: boolean;
  onOpenSettings: () => void;
}

export default function GeneralAnalysisForm({
  onSubmit,
  onBack,
  loading,
  error,
  hasGeminiApiKey,
  onOpenSettings,
}: GeneralAnalysisFormProps) {
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  const handleSubmit = () => {
    const context: AIContext = {};
    if (additionalContext.trim())
      context.additionalContext = additionalContext.trim();

    onSubmit(context, selectedModel);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-300">
            <Sparkles className="w-3.5 h-3.5" />
            Análisis General del CV
          </div>
          <span className="text-[10px] text-zinc-600">
            Todos los campos son opcionales
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cambiar modo
        </button>
      </div>

      {/* Additional Context */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Contexto adicional
          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
            Opcional
          </span>
        </label>
        <textarea
          placeholder="Cuéntanos más sobre lo que buscas: ¿estás en transición de carrera? ¿buscas tu primer empleo? ¿quieres destacar algo específico?"
          className="w-full h-24 px-4 py-3 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
        />
      </div>

      {/* Footer: Model selector + Submit */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        {/* Model selector */}
        <div className="flex-1">
          <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Modelo de IA
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer"
            >
              <option value="gemini-3.1-pro-preview">
                Gemini 3.1 Pro Preview (Más Potente)
              </option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              <option value="gemini-2.5-flash">
                Gemini 2.5 Flash (Rápido)
              </option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronRight className="w-4 h-4 text-zinc-500 rotate-90" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !hasGeminiApiKey}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/30 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed h-fit shrink-0 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analizar CV
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {!hasGeminiApiKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            Configura tu API key de Gemini para activar el análisis. La clave se
            guarda solo en este navegador.
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Configurar
          </button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
