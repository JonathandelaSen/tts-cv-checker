"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Star,
  ChevronRight,
  Clock,
  Cpu,
  Briefcase,
  FileDown,
  FileSearch,
  FileText,
  ExternalLink,
  ListChecks,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import type { AnalysisMode, AIContext, JobKeyData } from "@/lib/db";

interface AIAnalysisViewProps {
  analysis: {
    ai_score: number;
    ai_feedback: string;
    ai_keywords: string; // JSON
    ai_improvements: string; // JSON
    ai_model: string;
    ai_analyzed_at: string;
    analysis_mode: AnalysisMode;
    job_description: string | null;
    job_url: string | null;
    ai_context: AIContext | null;
    job_key_data: string | null;
    job_keywords: string | null;
    cv_keywords: string | null;
    matching_keywords: string | null;
    missing_keywords: string | null;
    id: string;
    cv_id: string | null;
    cv: {
      id: string;
      name: string;
      filename: string;
      type?: string;
    } | null;
    title: string;
    filename: string;
  };
  onDelete?: (id: string) => Promise<void>;
}

function safeParseArray(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function safeParseJobKeyData(value: string | null): JobKeyData | null {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed && typeof parsed === "object" ? (parsed as JobKeyData) : null;
  } catch {
    return null;
  }
}

export default function AIAnalysisView({ analysis, onDelete }: AIAnalysisViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const keywords = safeParseArray(analysis.ai_keywords);
  const improvements = safeParseArray(analysis.ai_improvements);
  const jobKeywords = safeParseArray(analysis.job_keywords);
  const cvKeywords = safeParseArray(analysis.cv_keywords);
  const matchingKeywords = safeParseArray(analysis.matching_keywords);
  const missingKeywords = safeParseArray(analysis.missing_keywords);
  const jobKeyData = safeParseJobKeyData(analysis.job_key_data);
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
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExport = () => {
    const cvName = analysis.cv?.name ?? analysis.filename;
    const cvUrl = analysis.cv
      ? `${window.location.origin}/api/cvs/${analysis.cv.id}/${analysis.cv.type === "template" ? "template-pdf" : "pdf"}`
      : null;
    const report = `
INFORME DE ANÁLISIS ATS
-----------------------
Archivo: ${analysis.filename}
Nombre: ${analysis.title}
CV utilizado: ${cvName}
${cvUrl ? `Link CV: ${cvUrl}` : ""}
ID de Análisis: ${analysis.id}
Fecha: ${formatDate(analysis.ai_analyzed_at)}
Modelo: ${analysis.ai_model}

PUNTUACIÓN: ${score}/100 (${getScoreLabel()})

FEEDBACK:
${analysis.ai_feedback}

PALABRAS CLAVE DETECTADAS:
${keywords.join(", ") || "Ninguna"}

KEYWORDS OFERTA:
${jobKeywords.join(", ") || "Ninguna"}

KEYWORDS CV:
${cvKeywords.join(", ") || "Ninguna"}

KEYWORDS FALTANTES:
${missingKeywords.join(", ") || "Ninguna"}

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

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("¿Seguro que quieres borrar este análisis? Esta acción no se puede deshacer.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(analysis.id);
    } catch (error) {
      console.error("Error deleting analysis:", error);
      alert("No se pudo borrar el análisis.");
    } finally {
      setIsDeleting(false);
    }
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
                  {analysis.analysis_mode === "general" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                      <FileSearch className="w-3 h-3" />
                      Análisis General
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <Briefcase className="w-3 h-3" />
                      Match con Oferta
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-zinc-100">
                  {analysis.title ||
                    (analysis.analysis_mode === "general"
                      ? "CV Quality Score"
                      : "ATS Match Score")}
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
                {analysis.job_url && (
                  <a
                    href={analysis.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1 rounded-md"
                  >
                    <ExternalLink className="w-3 h-3" />
                    URL oferta
                  </a>
                )}
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded-md transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Exportar Informe
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1 rounded-md transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {isDeleting ? "Borrando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {(analysis.cv || analysis.cv_id) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="flex flex-col gap-3 rounded-2xl border border-sky-500/10 bg-sky-500/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  CV utilizado
                </p>
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {analysis.cv?.name ?? analysis.filename}
                </p>
                {analysis.cv?.filename && (
                  <p className="truncate text-xs text-zinc-500">
                    {analysis.cv.filename}
                  </p>
                )}
              </div>
            </div>
            <a
              href={analysis.cv?.type === "template" ? `/api/cvs/${analysis.cv?.id}/template-pdf` : `/api/cvs/${analysis.cv?.id ?? analysis.cv_id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir CV
            </a>
          </motion.div>
        )}

        {/* Context: General analysis questionnaire */}
        {analysis.analysis_mode === "general" && analysis.ai_context?.additionalContext && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.03] p-6"
          >
            <h4 className="text-sm font-semibold text-violet-300 flex items-center gap-2 mb-3">
              <FileSearch className="w-4 h-4" />
              Contexto del Análisis
            </h4>
            <p className="text-xs text-zinc-400 italic bg-[#0a0a12] rounded-lg p-3 border border-white/[0.04]">
              {analysis.ai_context.additionalContext}
            </p>
          </motion.div>
        )}

        {analysis.analysis_mode === "job_match" && jobKeyData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <h4 className="text-sm font-semibold text-sky-300 flex items-center gap-2 mb-4">
              <ListChecks className="w-4 h-4" />
              Datos clave de la oferta
            </h4>
            <div className="grid gap-3 md:grid-cols-3">
              {([
                ["Puesto", jobKeyData.title],
                ["Empresa", jobKeyData.company],
                ["Ubicación", jobKeyData.location],
                ["Modalidad", jobKeyData.remote],
                ["Salario", jobKeyData.salary],
                ["Seniority", jobKeyData.seniority],
                ["Contrato", jobKeyData.contractType],
              ] as Array<[string, string | null | undefined]>).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.04] bg-[#0a0a12] p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {value || "No indicado"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {([
                ["Requisitos", jobKeyData.requirements],
                ["Responsabilidades", jobKeyData.responsibilities],
                ["Beneficios", jobKeyData.benefits],
                ["Puntos relevantes", jobKeyData.notablePoints],
              ] as Array<[string, string[] | undefined]>).map(([label, values]) => {
                const list = Array.isArray(values) ? values : [];
                return (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.04] bg-[#0a0a12] p-4"
                  >
                    <p className="mb-3 text-xs font-semibold text-zinc-300">
                      {label}
                    </p>
                    {list.length > 0 ? (
                      <ul className="space-y-2">
                        {list.map((item, index) => (
                          <li
                            key={`${item}-${index}`}
                            className="flex gap-2 text-xs text-zinc-400"
                          >
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400/70" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-zinc-600">
                        No indicado.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Job Description (if any) */}
        {analysis.analysis_mode === "job_match" && analysis.job_description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-6"
          >
            <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4" />
              Oferta de Trabajo Analizada
            </h4>
            <div className="text-sm text-zinc-400 bg-[#0a0a12] rounded-xl p-4 border border-white/[0.04] whitespace-pre-wrap max-h-96 overflow-y-auto">
              {analysis.job_description}
            </div>
          </motion.div>
        )}

        {analysis.analysis_mode === "job_match" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4" />
                Coincidencias CV ↔ oferta
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchingKeywords.length > 0 ? (
                  matchingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-sm italic text-zinc-500">
                    No se detectaron coincidencias destacadas.
                  </span>
                )}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2 mb-4">
                <XCircle className="w-4 h-4" />
                Keywords faltantes
              </h4>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.length > 0 ? (
                  missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-sm italic text-zinc-500">
                    No hay keywords críticas faltantes.
                  </span>
                )}
              </div>
            </motion.div>
          </div>
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
            {analysis.analysis_mode === "job_match" && (
              <div className="mb-4 grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-500">
                    Oferta
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {jobKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-500">
                    CV
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cvKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
