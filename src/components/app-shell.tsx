"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { type AnalysisSummary } from "@/components/sidebar";
import NewAnalysisFlow from "@/components/new-analysis-flow";
import CVLibrary from "@/components/cv-library";
import TemplatesView from "@/components/templates-view";
import CVEditorView from "@/components/cv-editor-view";
import ExtractionView from "@/components/extraction-view";
import AIAnalysisView from "@/components/ai-analysis-view";
import SettingsView from "@/components/settings-view";
import AdminObservabilityDashboard from "@/components/admin-observability-dashboard";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  AnalysisMode,
  AIContext,
  CVSummary,
} from "@/lib/db";
import { getStoredGeminiApiKey } from "@/lib/browser-preferences";

type ViewTab = "extraction" | "analysis";
type AppView =
  | "new"
  | "analysis"
  | "cvs"
  | "templates"
  | "editor"
  | "settings"
  | "admin";

interface FullAnalysis {
  id: string;
  cv_id: string | null;
  cv: {
    id: string;
    name: string;
    filename: string;
  } | null;
  title: string;
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
  analysis_mode: AnalysisMode;
  ai_model: string | null;
  job_description: string | null;
  job_url: string | null;
  ai_context: AIContext | null;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_keywords: string | null;
  ai_improvements: string | null;
  job_key_data: string | null;
  job_keywords: string | null;
  cv_keywords: string | null;
  matching_keywords: string | null;
  missing_keywords: string | null;
  ai_analyzed_at: string | null;
}

interface AppShellProps {
  initialView?: AppView;
  initialUserEmail?: string | null;
  initialIsAdmin?: boolean;
}

export default function AppShell({
  initialView = "new",
  initialUserEmail = null,
  initialIsAdmin = false,
}: AppShellProps) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [cvs, setCVs] = useState<CVSummary[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<FullAnalysis | null>(
    null
  );
  const [viewTab, setViewTab] = useState<ViewTab>("extraction");
  const [activeView, setActiveView] = useState<AppView>(initialView);
  const [activeEditorCvId, setActiveEditorCvId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [geminiApiKey, setGeminiApiKey] = useState("");

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

  const fetchCVs = useCallback(async () => {
    try {
      const res = await fetch("/api/cvs");
      if (res.ok) {
        const data = await res.json();
        setCVs(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() =>
      Promise.all([fetchAnalyses(), fetchCVs()])
    );
  }, [fetchAnalyses, fetchCVs]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    const syncGeminiApiKey = () => setGeminiApiKey(getStoredGeminiApiKey());

    syncGeminiApiKey();
    window.addEventListener("storage", syncGeminiApiKey);

    return () => window.removeEventListener("storage", syncGeminiApiKey);
  }, []);

  // Fetch single analysis detail
  const fetchAnalysisDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (res.ok) {
        const data: FullAnalysis = await res.json();
        setActiveAnalysis(data);
        setViewTab(data.ai_score !== null ? "analysis" : "extraction");
        setActiveView("analysis");
      }
    } catch {
      // silent
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const analysisId = params.get("analysis");
    const view = params.get("view");

    if (analysisId) {
      queueMicrotask(() => {
        setActiveAnalysisId(analysisId);
        setActiveView("analysis");
        void fetchAnalysisDetail(analysisId);
      });
    } else if (view === "cvs") {
      queueMicrotask(() => {
        setActiveView("cvs");
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
      });
    } else if (view === "templates") {
      queueMicrotask(() => {
        setActiveView("templates");
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
      });
    } else if (view === "editor") {
      queueMicrotask(() => {
        setActiveView("editor");
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
        setActiveEditorCvId(params.get("cv"));
      });
    } else if (view === "settings") {
      queueMicrotask(() => {
        setActiveView("settings");
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
      });
    } else if (window.location.pathname === "/admin" || view === "admin") {
      queueMicrotask(() => {
        setActiveView("admin");
        setActiveAnalysisId(null);
        setActiveAnalysis(null);
      });
    }
  }, [fetchAnalysisDetail]);

  // Handle selecting an analysis
  const handleSelect = (id: string) => {
    setActiveAnalysisId(id);
    setActiveView("analysis");
    window.history.replaceState(
      null,
      "",
      `/?analysis=${encodeURIComponent(id)}`
    );
    fetchAnalysisDetail(id);
  };

  // Handle new analysis
  const handleNewAnalysis = () => {
    setActiveView("new");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    window.history.replaceState(null, "", "/");
  };

  const handleOpenCVs = () => {
    setActiveView("cvs");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    window.history.replaceState(null, "", "/?view=cvs");
    fetchCVs();
  };

  const handleOpenTemplates = () => {
    setActiveView("templates");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    window.history.replaceState(null, "", "/?view=templates");
    fetchCVs();
  };

  const handleOpenEditor = (cvId?: string | null) => {
    const templateCVs = cvs.filter(c => c.type === "template");
    const targetCvId =
      cvId ??
      activeEditorCvId ??
      templateCVs[0]?.id ??
      null;
    setActiveView("editor");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    setActiveEditorCvId(targetCvId);
    const suffix = targetCvId ? `&cv=${encodeURIComponent(targetCvId)}` : "";
    window.history.replaceState(null, "", `/?view=editor${suffix}`);
    fetchCVs();
  };

  const handleOpenSettings = () => {
    setActiveView("settings");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    window.history.replaceState(null, "", "/?view=settings");
  };

  const handleOpenAdmin = () => {
    setActiveView("admin");
    setActiveAnalysisId(null);
    setActiveAnalysis(null);
    window.history.replaceState(null, "", "/admin");
  };

  // Handle analysis creation complete
  const handleAnalysisCreated = (id: string) => {
    setActiveAnalysisId(id);
    setActiveView("analysis");
    window.history.replaceState(
      null,
      "",
      `/?analysis=${encodeURIComponent(id)}`
    );
    fetchAnalysisDetail(id);
    fetchAnalyses();
    fetchCVs();
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
          setActiveView("new");
          window.history.replaceState(null, "", "/");
        }
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
        activeView={activeView}
        onSelect={handleSelect}
        onNewAnalysis={handleNewAnalysis}
        onOpenCVs={handleOpenCVs}
        onOpenTemplates={handleOpenTemplates}
        onOpenEditor={() => handleOpenEditor()}
        onOpenSettings={handleOpenSettings}
        onOpenAdmin={handleOpenAdmin}
        onDelete={handleDelete}
        userEmail={userEmail}
        isAdmin={isAdmin}
        isForceCollapsed={activeView === "editor"}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        <AnimatePresence mode="wait">
          {activeView === "new" ? (
            <motion.div
              key="new-analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <NewAnalysisFlow
                cvs={cvs.filter(c => c.type === "uploaded")}
                onCVCreated={fetchCVs}
                onAnalysisCreated={handleAnalysisCreated}
              />
            </motion.div>
          ) : activeView === "cvs" ? (
            <motion.div
              key="cv-library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
          <CVLibrary
                cvs={cvs}
                analyses={analyses}
                onRefresh={fetchCVs}
                onOpenAnalysis={handleSelect}
                onOpenEditor={handleOpenEditor}
              />
            </motion.div>
          ) : activeView === "templates" ? (
            <motion.div
              key="templates"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <TemplatesView
                cvs={cvs.filter(c => c.type === "uploaded")}
                geminiApiKey={geminiApiKey}
                hasGeminiApiKey={geminiApiKey.length > 0}
                onOpenSettings={handleOpenSettings}
                onOpenEditor={handleOpenEditor}
                onOpenUpload={handleNewAnalysis}
                onCVUpdated={fetchCVs}
              />
            </motion.div>
          ) : activeView === "editor" ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <CVEditorView
                cvs={cvs.filter(c => c.type === "template")}
                hasOriginalCVs={cvs.some(c => c.type === "uploaded")}
                activeVersionId={activeEditorCvId}
                geminiApiKey={geminiApiKey}
                hasGeminiApiKey={geminiApiKey.length > 0}
                onOpenTemplates={handleOpenTemplates}
                onOpenSettings={handleOpenSettings}
                onStartAnalysis={handleNewAnalysis}
                onCVUpdated={fetchCVs}
                onBackToLibrary={handleOpenCVs}
              />
            </motion.div>
          ) : activeView === "settings" ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <SettingsView
                geminiApiKey={geminiApiKey}
                onGeminiApiKeyChange={setGeminiApiKey}
                userEmail={userEmail}
              />
            </motion.div>
          ) : activeView === "admin" && isAdmin ? (
            <motion.div
              key="admin-observability"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <AdminObservabilityDashboard userEmail={userEmail} />
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
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Tabs - Extraction / Analysis */}
              {activeAnalysis.ai_score !== null && (
                <div className="shrink-0 flex items-center gap-1 px-4 sm:px-6 pt-4">
                  <button
                    onClick={() => setViewTab("extraction")}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                      ${
                        viewTab === "extraction"
                          ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Extracción
                  </button>
                  <button
                    onClick={() => setViewTab("analysis")}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                      ${
                        viewTab === "analysis"
                          ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    className="flex-1 flex flex-col overflow-hidden min-h-0"
                  >
                    <ExtractionView
                      analysis={activeAnalysis}
                      onAIAnalysisComplete={handleAIComplete}
                      geminiApiKey={geminiApiKey}
                      hasGeminiApiKey={geminiApiKey.length > 0}
                      onOpenSettings={handleOpenSettings}
                    />
                  </motion.div>
                ) : activeAnalysis.ai_score !== null ? (
                  <motion.div
                    key="analysis-view"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col overflow-hidden min-h-0"
                  >
                    <AIAnalysisView
                      analysis={{
                        ai_score: activeAnalysis.ai_score,
                        ai_feedback: activeAnalysis.ai_feedback!,
                        ai_keywords: activeAnalysis.ai_keywords!,
                        ai_improvements: activeAnalysis.ai_improvements!,
                        ai_model: activeAnalysis.ai_model!,
                        ai_analyzed_at: activeAnalysis.ai_analyzed_at!,
                        analysis_mode: activeAnalysis.analysis_mode,
                        job_description: activeAnalysis.job_description,
                        job_url: activeAnalysis.job_url,
                        ai_context: activeAnalysis.ai_context,
                        job_key_data: activeAnalysis.job_key_data,
                        job_keywords: activeAnalysis.job_keywords,
                        cv_keywords: activeAnalysis.cv_keywords,
                        matching_keywords: activeAnalysis.matching_keywords,
                        missing_keywords: activeAnalysis.missing_keywords,
                        id: activeAnalysis.id,
                        cv_id: activeAnalysis.cv_id,
                        cv: activeAnalysis.cv,
                        title: activeAnalysis.title,
                        filename: activeAnalysis.filename,
                      }}
                      onDelete={handleDelete}
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
