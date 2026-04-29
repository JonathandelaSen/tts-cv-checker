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
  Briefcase,
} from "lucide-react";

interface JobMatchFormProps {
  onSubmit: (jobDescription: string, model: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export default function JobMatchForm({
  onSubmit,
  onBack,
  loading,
  error,
}: JobMatchFormProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  const handleSubmit = () => {
    if (!jobDescription.trim()) return;
    onSubmit(jobDescription.trim(), selectedModel);
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-300">
            <Briefcase className="w-3.5 h-3.5" />
            Match con Oferta de Trabajo
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cambiar modo
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
        <div className="space-y-3">
          {/* Job description */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Descripción de la oferta
              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                Requerido
              </span>
            </label>
            <textarea
              placeholder="Pega aquí la oferta de trabajo completa para una comparación precisa..."
              className="w-full h-48 px-4 py-3 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* Model selector */}
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Modelo de IA
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-10 px-4 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/40 appearance-none cursor-pointer"
              >
                <option value="gemini-3.1-pro-preview">
                  Gemini 3.1 Pro Preview (Más Potente)
                </option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">
                  Gemini 2.5 Flash (Rápido)
                </option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronRight className="w-4 h-4 text-zinc-500 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !jobDescription.trim()}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-900/30 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed h-fit"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Comparar con Oferta
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

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
