"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { type AnalysisSummary } from "@/components/sidebar";
import UploadPhase from "@/components/upload-phase";
import ExtractionView from "@/components/extraction-view";
import AIAnalysisView from "@/components/ai-analysis-view";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";

type ViewTab = "extraction" | "analysis";

interface FullAnalysis {
  id: string;
  filename: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
  ai_model: string | null;
  job_description: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_keywords: string | null;
  ai_improvements: string | null;
  ai_analyzed_at: string | null;
}

export default function Home() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<FullAnalysis | null>(
    null
  );
  const [viewTab, setViewTab] = useState<ViewTab>("extraction");
  const [showUpload, setShowUpload] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch analyses list
  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await fetch("/api/analyses");
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  // Fetch single analysis detail
  const fetchAnalysisDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (res.ok) {
        const data: FullAnalysis = await res.json();
        setActiveAnalysis(data);
        setViewTab(data.ai_score !== null ? "analysis" : "extraction");
      }
    } catch {
      // silent
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Handle selecting an analysis
  const handleSelect = (id: string) => {
    setActiveAnalysisId(id);
    setShowUpload(false);
    fetchAnalysisDetail(id);
  };

  // Handle new analysis
  const handleNewAnalysis = () => {
    setShowUpload(true);
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
  };

  // Handle upload complete
  const handleUploadComplete = (id: string) => {
    setActiveAnalysisId(id);
    setShowUpload(false);
    fetchAnalysisDetail(id);
    fetchAnalyses();
  };

  // Handle AI analysis complete
  const handleAIComplete = () => {
    if (activeAnalysisId) {
      fetchAnalysisDetail(activeAnalysisId);
      fetchAnalyses();
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAnalyses();
        if (activeAnalysisId === id) {
          setActiveAnalysisId(null);
          setActiveAnalysis(null);
          setShowUpload(true);
        }
      }
    } catch {
      // silent
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/analyses", { method: "DELETE" });
      if (res.ok) {
        await fetchAnalyses();
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
        setShowUpload(true);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090f]">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[15%] w-[500px] h-[500px] bg-violet-600/[0.05] rounded-full blur-[130px]" />
      </div>

      {/* Sidebar */}
      <Sidebar
        analyses={analyses}
        activeId={activeAnalysisId}
        onSelect={handleSelect}
        onNewAnalysis={handleNewAnalysis}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {showUpload ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <UploadPhase onUploadComplete={handleUploadComplete} />
            </motion.div>
          ) : loadingDetail ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-sm">Cargando análisis...</span>
              </div>
            </motion.div>
          ) : activeAnalysis ? (
            <motion.div
              key={activeAnalysis.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Tabs - Extraction / Analysis */}
              {activeAnalysis.ai_score !== null && (
                <div className="shrink-0 flex items-center gap-1 px-6 pt-4">
                  <button
                    onClick={() => setViewTab("extraction")}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${
                        viewTab === "extraction"
                          ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    <FileText className="w-4 h-4" />
                    Extracción
                  </button>
                  <button
                    onClick={() => setViewTab("analysis")}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${
                        viewTab === "analysis"
                          ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    <Sparkles className="w-4 h-4" />
                    Análisis IA
                  </button>
                </div>
              )}

              {/* View Content */}
              <AnimatePresence mode="wait">
                {viewTab === "extraction" ? (
                  <motion.div
                    key="extraction-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <ExtractionView
                      analysis={activeAnalysis}
                      onAIAnalysisComplete={handleAIComplete}
                    />
                  </motion.div>
                ) : activeAnalysis.ai_score !== null ? (
                  <motion.div
                    key="analysis-view"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <AIAnalysisView
                      analysis={{
                        ai_score: activeAnalysis.ai_score,
                        ai_feedback: activeAnalysis.ai_feedback!,
                        ai_keywords: activeAnalysis.ai_keywords!,
                        ai_improvements: activeAnalysis.ai_improvements!,
                        ai_model: activeAnalysis.ai_model!,
                        ai_analyzed_at: activeAnalysis.ai_analyzed_at!,
                        job_description: activeAnalysis.job_description,
                      }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center text-zinc-600">
                <p>Selecciona un análisis o sube un nuevo CV</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
