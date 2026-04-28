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
  Sparkles,
  Briefcase,
  Cpu,
  Loader2,
  ChevronRight,
  ArrowRight,
  Download,
  Eye,
  X,
} from "lucide-react";

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
    filename: string;
    ai_score: number | null;
  };
  onAIAnalysisComplete: () => void;
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
}: ExtractionViewProps) {
  const [activeTab, setActiveTab] = useState<ParserTab>("python");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-pro-preview");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

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

  const handleAIAnalysis = async () => {
    setLoadingAI(true);
    setAiError(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysis.id,
          jobDescription: jobDescription.trim() || undefined,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error en el análisis IA");
      }

      onAIAnalysisComplete();
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {analysis.filename}
            </h2>
            <p className="text-xs text-zinc-500">
              Texto extraído con 3 parsers diferentes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.id && (
            <>
              <button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-1 ${
                  showPdfPreview 
                    ? "bg-indigo-500 text-white" 
                    : "text-zinc-400 bg-zinc-800/60 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {showPdfPreview ? "Cerrar PDF" : "Ver PDF Original"}
              </button>
              <a
                href={`/api/analyses/${analysis.id}/pdf`}
                download={analysis.filename}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all mr-2"
                title="Descargar PDF original"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </a>
            </>
          )}
          <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded-md">
            {wordCount.toLocaleString()} palabras
          </span>
          <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded-md">
            {charCount.toLocaleString()} caracteres
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
        {/* Parser Tabs */}
        <div className="shrink-0 flex gap-2">
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
                  flex items-center gap-2.5 px-4 py-3 rounded-xl transition-all duration-200 text-left flex-1
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
                    className={`text-sm font-medium truncate ${activeTab === parser.key ? "text-zinc-100" : "text-zinc-400"}`}
                  >
                    {parser.label}
                  </p>
                  <p className="text-[11px] text-zinc-600 truncate">
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
        <div className="flex-1 flex gap-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className={`
                flex-1 flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden
                ${fullscreen ? "fixed inset-4 z-50" : "relative"}
              `}
            >
              {/* Toolbar */}
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${PARSERS.find((p) => p.key === activeTab)?.color}`}
                  />
                  <span className="text-xs text-zinc-400 font-medium">
                    {PARSERS.find((p) => p.key === activeTab)?.description}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    disabled={!currentText}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all disabled:opacity-30"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
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
              <div className="flex-1 overflow-auto p-5">
                {currentError && !currentText ? (
                  <div className="flex items-start gap-3 text-rose-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Error en la extracción
                      </p>
                      <p className="text-xs text-rose-400/70 mt-1 font-mono">
                        {currentError}
                      </p>
                    </div>
                  </div>
                ) : currentText ? (
                  <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {currentText}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <FileText className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">
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
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: "50%", x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden shadow-2xl"
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
                  src={`/api/analyses/${analysis.id}/pdf#toolbar=0`}
                  className="w-full h-full border-none invert brightness-90 hue-rotate-180"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-300">
                <Sparkles className="w-3.5 h-3.5" />
                Fase 2 — Análisis con Inteligencia Artificial
              </div>
              <span className="text-xs text-zinc-600">Opcional</span>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="space-y-3">
                {/* Job description */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-zinc-400 mb-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    Descripción de la oferta
                    <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      Opcional
                    </span>
                  </label>
                  <textarea
                    placeholder="Pega aquí la oferta de trabajo para una comparación más precisa..."
                    className="w-full h-24 px-4 py-3 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
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
                      className="w-full h-10 px-4 rounded-xl bg-[#0a0a12] border border-white/[0.06] text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/40 appearance-none cursor-pointer"
                    >
                      <option value="gemini-3.1-pro-preview">
                        Gemini 3.1 Pro Preview (Más Potente)
                      </option>
                      <option value="gemini-2.5-pro">
                        Gemini 2.5 Pro
                      </option>
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
                onClick={handleAIAnalysis}
                disabled={loadingAI}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/30 transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed h-fit"
              >
                {loadingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analizar con IA
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
              >
                {aiError}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
