"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  AlertCircle,
  Download,
  Eye,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AnalysisMode, AIContext } from "@/lib/db";
import AnalysisModeSelector from "./analysis-mode-selector";
import GeneralAnalysisForm from "./general-analysis-form";
import JobMatchForm from "./job-match-form";

interface ExtractionData {
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
}

interface ExtractionViewProps {
  analysis: ExtractionData & {
    id: string;
    cv_id?: string | null;
    title?: string;
    filename: string;
    ai_score: number | null;
    job_url?: string | null;
    cv?: { id?: string; name?: string; filename?: string; type?: string } | null;
  };
  onAIAnalysisComplete: () => void;
  geminiApiKey: string;
  hasGeminiApiKey: boolean;
  onOpenSettings: () => void;
}

type ParserTab = "python" | "pdfjs" | "node";

const PARSERS: {
  key: ParserTab;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: "python",
    label: "Python (pdfminer)",
    description: "Respeta mejor el layout — usado por la mayoría de ATS",
    color: "bg-blue-500",
  },
  {
    key: "pdfjs",
    label: "Node (pdfjs-dist)",
    description: "Motor PDF del navegador — simula lectura web",
    color: "bg-emerald-500",
  },
  {
    key: "node",
    label: "Node (pdf-parse)",
    description: "Parser ligero de Node.js — extracción básica",
    color: "bg-amber-500",
  },
];

export default function ExtractionView({
  analysis,
  onAIAnalysisComplete,
  geminiApiKey,
  hasGeminiApiKey,
  onOpenSettings,
}: ExtractionViewProps) {
  const [activeTab, setActiveTab] = useState<ParserTab>("python");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Analysis mode state
  const [selectedMode, setSelectedMode] = useState<AnalysisMode | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const getTextForTab = (tab: ParserTab) => {
    switch (tab) {
      case "python":
        return analysis.text_python;
      case "pdfjs":
        return analysis.text_pdfjs;
      case "node":
        return analysis.text_node;
    }
  };

  const getErrorForTab = (tab: ParserTab) => {
    switch (tab) {
      case "python":
        return analysis.extract_error_python;
      case "pdfjs":
        return analysis.extract_error_pdfjs;
      case "node":
        return analysis.extract_error_node;
    }
  };

  const currentText = getTextForTab(activeTab);
  const currentError = getErrorForTab(activeTab);
  const pdfUrl = analysis.cv_id
    ? analysis.cv?.type === "template"
      ? `/api/cvs/${analysis.cv_id}/template-pdf`
      : `/api/cvs/${analysis.cv_id}/pdf`
    : `/api/analyses/${analysis.id}/pdf`;

  const wordCount = currentText
    ? currentText.split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = currentText ? currentText.length : 0;

  const handleCopy = async () => {
    if (!currentText) return;
    await navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGeneralAnalysis = async (context: AIContext, model: string) => {
    if (!hasGeminiApiKey) {
      setAiError("Configura tu API key de Gemini antes de lanzar el análisis.");
      return;
    }

    setLoadingAI(true);
    setAiError(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          mode: "general",
          context,
          model,
          geminiApiKey,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error en el análisis IA");
      }

      onAIAnalysisComplete();
    } catch (err: unknown) {
      setAiError(getErrorMessage(err));
    } finally {
      setLoadingAI(false);
    }
  };

  const handleJobMatchAnalysis = async (
    jobDescription: string,
    model: string
  ) => {
    if (!hasGeminiApiKey) {
      setAiError("Configura tu API key de Gemini antes de lanzar el análisis.");
      return;
    }

    setLoadingAI(true);
    setAiError(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          mode: "job_match",
          jobDescription,
          model,
          geminiApiKey,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error en el análisis IA");
      }

      onAIAnalysisComplete();
    } catch (err: unknown) {
      setAiError(getErrorMessage(err));
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">
              {analysis.filename}
            </h2>
            <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
              Texto extraído con 3 parsers diferentes
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analysis.id && (
            <>
              <button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showPdfPreview
                    ? "bg-indigo-500 text-white"
                    : "text-zinc-400 bg-zinc-800/60 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">
                  {showPdfPreview ? "Cerrar PDF" : "Ver PDF Original"}
                </span>
                <span className="xs:hidden">
                  {showPdfPreview ? "Cerrar" : "PDF"}
                </span>
              </button>
              <a
                href={`${pdfUrl}?download=1`}
                download={analysis.filename}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
                title="Descargar PDF original"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Descargar</span>
              </a>
            </>
          )}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <span className="text-[10px] sm:text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded-md whitespace-nowrap">
              {wordCount.toLocaleString()} <span className="hidden xs:inline">palabras</span><span className="xs:hidden">w</span>
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded-md whitespace-nowrap">
              {charCount.toLocaleString()} <span className="hidden xs:inline">caracteres</span><span className="xs:hidden">ch</span>
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-auto p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Parser Tabs */}
        <div className="shrink-0 flex flex-col xs:flex-row gap-2">
          {PARSERS.map((parser) => {
            const text = getTextForTab(parser.key);
            const error = getErrorForTab(parser.key);
            const hasContent = !!text;
            const hasError = !!error;

            return (
              <button
                key={parser.key}
                onClick={() => setActiveTab(parser.key)}
                className={`
                  flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-left flex-1
                  ${
                    activeTab === parser.key
                      ? "bg-white/[0.08] border border-white/[0.1] shadow-lg"
                      : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                  }
                `}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${parser.color} ${
                    !hasContent && !hasError ? "opacity-30" : ""
                  }`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-medium truncate ${activeTab === parser.key ? "text-zinc-100" : "text-zinc-400"}`}
                  >
                    {parser.label}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-zinc-600 truncate">
                    {hasError
                      ? "Error"
                      : hasContent
                        ? `${(text?.length || 0).toLocaleString()} chars`
                        : "Sin resultado"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Text Content Area & PDF Preview Side-by-Side */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className={`
                flex-1 flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden min-h-[300px] lg:min-h-0
                ${fullscreen ? "fixed inset-4 z-50" : "relative"}
              `}
            >
              {/* Toolbar */}
              <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${PARSERS.find((p) => p.key === activeTab)?.color}`}
                  />
                  <span className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate">
                    {PARSERS.find((p) => p.key === activeTab)?.description}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleCopy}
                    disabled={!currentText}
                    className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all disabled:opacity-30"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden xs:inline">{copied ? "Copiado" : "Copiar"}</span>
                  </button>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
                  >
                    {fullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 overflow-auto p-4 sm:p-5">
                {currentError && !currentText ? (
                  <div className="flex items-start gap-3 text-rose-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Error en la extracción
                      </p>
                      <p className="text-xs text-rose-400/70 mt-1 font-mono break-all">
                        {currentError}
                      </p>
                    </div>
                  </div>
                ) : currentText ? (
                  <pre className="text-xs sm:text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {currentText}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-zinc-600">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 mb-3 opacity-30" />
                    <p className="text-xs sm:text-sm text-center px-4">
                      Este parser no produjo texto para este PDF
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* PDF Previewer Panel */}
          <AnimatePresence>
            {showPdfPreview && !fullscreen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col flex-1 rounded-2xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0"
              >
                <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-indigo-500/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Vista Previa del PDF
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <iframe
                  src={`${pdfUrl}#toolbar=0`}
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fullscreen backdrop */}
        {fullscreen && (
          <div
            className="fixed inset-0 bg-black/80 z-40"
            onClick={() => setFullscreen(false)}
          />
        )}

        {/* Phase 2 - AI Analysis Section */}
        {analysis.ai_score === null && (
          <AnimatePresence mode="wait">
            {selectedMode === null ? (
              <AnalysisModeSelector
                key="mode-selector"
                onSelectMode={setSelectedMode}
              />
            ) : selectedMode === "general" ? (
              <GeneralAnalysisForm
                key="general-form"
                onSubmit={handleGeneralAnalysis}
                onBack={() => setSelectedMode(null)}
                loading={loadingAI}
                error={aiError}
                hasGeminiApiKey={hasGeminiApiKey}
                onOpenSettings={onOpenSettings}
              />
            ) : (
              <JobMatchForm
                key="job-match-form"
                onSubmit={handleJobMatchAnalysis}
                onBack={() => setSelectedMode(null)}
                loading={loadingAI}
                error={aiError}
                hasGeminiApiKey={hasGeminiApiKey}
                onOpenSettings={onOpenSettings}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
