"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Star,
  ChevronRight,
  Sparkles,
  Clock,
  Cpu,
  Briefcase,
  Download,
  FileDown,
} from "lucide-react";

interface AIAnalysisViewProps {
  analysis: {
    ai_score: number;
    ai_feedback: string;
    ai_keywords: string; // JSON
    ai_improvements: string; // JSON
    ai_model: string;
    ai_analyzed_at: string;
    job_description: string | null;
    id: string;
    filename: string;
  };
}

export default function AIAnalysisView({ analysis }: AIAnalysisViewProps) {
  const keywords: string[] = JSON.parse(analysis.ai_keywords || "[]");
  const improvements: string[] = JSON.parse(analysis.ai_improvements || "[]");
  const score = analysis.ai_score;

  const getScoreColor = () => {
    if (score >= 80) return { text: "text-emerald-400", stroke: "stroke-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (score >= 60) return { text: "text-amber-400", stroke: "stroke-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    return { text: "text-rose-400", stroke: "stroke-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  };

  const colors = getScoreColor();

  const getScoreLabel = () => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Mejorable";
    return "Necesita Trabajo";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "Z");
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExport = () => {
    const report = `
INFORME DE ANÁLISIS ATS
-----------------------
Archivo: ${analysis.filename}
ID de Análisis: ${analysis.id}
Fecha: ${formatDate(analysis.ai_analyzed_at)}
Modelo: ${analysis.ai_model}

PUNTUACIÓN: ${score}/100 (${getScoreLabel()})

FEEDBACK:
${analysis.ai_feedback}

PALABRAS CLAVE DETECTADAS:
${keywords.join(", ") || "Ninguna"}

ÁREAS DE MEJORA:
${improvements.map((imp) => `- ${imp}`).join("\n") || "Sin sugerencias"}

${analysis.job_description ? `OFERTA DE TRABAJO:\n${analysis.job_description}` : ""}
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ATS_Report_${analysis.ai_analyzed_at.replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 overflow-y-auto p-6"
    >
      <div className="w-full space-y-6">
        {/* Score Header */}
        <div
          className={`rounded-2xl border ${colors.border} ${colors.bg} p-8 backdrop-blur-sm`}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="relative shrink-0 w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="fill-none stroke-white/[0.06]"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`fill-none ${colors.stroke}`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 264" }}
                  animate={{
                    strokeDasharray: `${score * 2.64} 264`,
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className={`text-5xl font-black ${colors.text}`}
                >
                  {score}
                </motion.span>
                <span className="text-zinc-500 text-xs font-semibold tracking-wider mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Score Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <span
                    className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text} ${colors.border} border`}
                  >
                    {getScoreLabel()}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  ATS Match Score
                </h3>
              </div>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {analysis.ai_feedback}
              </p>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                  <Cpu className="w-3 h-3" />
                  {analysis.ai_model}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                  <Clock className="w-3 h-3" />
                  {formatDate(analysis.ai_analyzed_at)}
                </span>
                {analysis.job_description && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                    <Briefcase className="w-3 h-3" />
                    Con oferta
                  </span>
                )}
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-md transition-all ml-auto"
                >
                  <FileDown className="w-3 h-3" />
                  Exportar Informe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Job Description (if any) */}
        {analysis.job_description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Oferta de Trabajo Analizada
            </h4>
            <div className="text-sm text-zinc-400 bg-[#0a0a12] rounded-xl p-4 border border-white/[0.04] whitespace-pre-wrap max-h-96 overflow-y-auto">
              {analysis.job_description}
            </div>
          </motion.div>
        )}

        {/* Keywords & Improvements Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Keywords */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              Keywords Encontradas
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywords.length > 0 ? (
                keywords.map((kw, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                  >
                    {kw}
                  </motion.span>
                ))
              ) : (
                <span className="text-zinc-500 text-sm italic">
                  No se detectaron palabras clave destacadas.
                </span>
              )}
            </div>
          </motion.div>

          {/* Improvements */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-4">
              <Star className="w-4 h-4" />
              Áreas de Mejora
            </h4>
            <ul className="space-y-3">
              {improvements.length > 0 ? (
                improvements.map((imp, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-start gap-2.5 text-sm text-zinc-300"
                  >
                    <ChevronRight className="w-4 h-4 mt-0.5 text-amber-500/70 shrink-0" />
                    <span>{imp}</span>
                  </motion.li>
                ))
              ) : (
                <span className="text-zinc-500 text-sm italic">
                  Sin sugerencias de mejora.
                </span>
              )}
            </ul>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
