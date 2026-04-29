"use client";

import { motion } from "framer-motion";
import { FileSearch, Briefcase, ArrowRight } from "lucide-react";
import type { AnalysisMode } from "@/lib/db";

interface AnalysisModeSelectorProps {
  onSelectMode: (mode: AnalysisMode) => void;
}

const MODES = [
  {
    key: "general" as AnalysisMode,
    icon: FileSearch,
    title: "Análisis General",
    description:
      "Evaluación completa de tu CV: estructura, legibilidad ATS, claridad, keywords y mejoras generales.",
    gradient: "from-violet-600/20 to-indigo-600/20",
    borderHover: "hover:border-violet-500/40",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    tagColor: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  },
  {
    key: "job_match" as AnalysisMode,
    icon: Briefcase,
    title: "Match con Oferta",
    description:
      "Compara tu CV contra una oferta de trabajo específica. Análisis de keywords, gaps y fit score.",
    gradient: "from-emerald-600/20 to-teal-600/20",
    borderHover: "hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    tagColor: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    tag: "Comparar",
  },
];

export default function AnalysisModeSelector({
  onSelectMode,
}: AnalysisModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
          ✦ Fase 2 — Elige el tipo de análisis
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {MODES.map((mode, i) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              onClick={() => onSelectMode(mode.key)}
              className={`
                group relative flex flex-col items-start gap-4 p-6 rounded-2xl
                border border-white/[0.06] bg-gradient-to-br ${mode.gradient}
                ${mode.borderHover} hover:shadow-xl
                transition-all duration-300 text-left cursor-pointer
              `}
            >
              {/* Tag */}
              {mode.tag && (
                <span
                  className={`absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mode.tagColor}`}
                >
                  {mode.tag}
                </span>
              )}

              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-xl ${mode.iconBg} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${mode.iconColor}`} />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-base font-semibold text-zinc-100 mb-1.5">
                  {mode.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors mt-auto">
                Seleccionar
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
