"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
  Clock,
  UserCircle,
  FileSearch,
  Briefcase,
  FolderOpen,
  Settings,
  ShieldCheck,
  Menu,
  LayoutTemplate,
  Wand2,
} from "lucide-react";
import type { AnalysisMode } from "@/lib/db";

export interface AnalysisSummary {
  id: string;
  cv_id: string | null;
  title: string;
  filename: string;
  created_at: string;
  analysis_mode: AnalysisMode;
  ai_score: number | null;
  ai_analyzed_at: string | null;
  job_url: string | null;
}

interface SidebarProps {
  analyses: AnalysisSummary[];
  activeId: string | null;
  activeView:
    | "new"
    | "analysis"
    | "cvs"
    | "templates"
    | "editor"
    | "settings"
    | "admin";
  onSelect: (id: string) => void;
  onNewAnalysis: () => void;
  onOpenCVs: () => void;
  onOpenTemplates: () => void;
  onOpenEditor: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onDelete: (id: string) => void;
  userEmail: string | null;
  isAdmin?: boolean;
  isForceCollapsed?: boolean;
}

export default function Sidebar({
  analyses,
  activeId,
  activeView,
  onSelect,
  onNewAnalysis,
  onOpenCVs,
  onOpenTemplates,
  onOpenEditor,
  onOpenSettings,
  onOpenAdmin,
  onDelete,
  userEmail,
  isAdmin = false,
  isForceCollapsed = false,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const collapsed = isForceCollapsed || internalCollapsed;

  const setCollapsed = (val: boolean) => {
    if (isForceCollapsed) return;
    setInternalCollapsed(val);
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const generalAnalyses = analyses.filter((a) => a.analysis_mode === "general");
  const jobAnalyses = analyses.filter((a) => a.analysis_mode === "job_match");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Ahora";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "";
    if (score >= 80) return "text-emerald-400 bg-emerald-500/15";
    if (score >= 60) return "text-amber-400 bg-amber-500/15";
    return "text-rose-400 bg-rose-500/15";
  };

  return (
    <>
      <AnimatePresence>
        {isMobile && collapsed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setCollapsed(false)}
            className="md:hidden fixed bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/30 active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobile && !collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCollapsed(true)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[40]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? (collapsed ? 0 : 280) : (collapsed ? 56 : 280),
          x: isMobile && collapsed ? -280 : 0
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`h-screen flex flex-col border-r border-white/[0.06] bg-[#0d0d14]/95 backdrop-blur-xl shrink-0 overflow-hidden z-50 ${
          isMobile ? "fixed left-0 top-0 bottom-0" : "relative"
        }`}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-3 h-14 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-zinc-100 truncate">
                ATS CV AI Checker
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New Analysis Button */}
      <div className="px-2 pb-2 shrink-0 space-y-2">
        <button
          onClick={onNewAnalysis}
          className={`
            w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
            bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
            text-white shadow-lg shadow-indigo-900/30 active:scale-[0.97]
            ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
          `}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Nuevo Análisis</span>}
        </button>
        <button
          onClick={onOpenCVs}
          className={`
            w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
            ${activeView === "cvs" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}
            ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
          `}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Mis CVs</span>}
        </button>
        <button
          onClick={onOpenTemplates}
          className={`
            w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
            ${activeView === "templates" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}
            ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
          `}
        >
          <LayoutTemplate className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Plantillas</span>}
        </button>
        <button
          onClick={onOpenEditor}
          className={`
            w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
            ${activeView === "editor" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}
            ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
          `}
        >
          <Wand2 className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Editor</span>}
        </button>
      </div>

      {/* Divider */}
      <div className="px-3 shrink-0">
        <div className="border-t border-white/[0.06]" />
      </div>

      {/* Analysis List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {analyses.length === 0 && !collapsed && (
          <div className="text-center py-8 px-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-zinc-800/50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-600">
              No hay análisis aún.
              <br />
              Sube tu primer CV para empezar.
            </p>
          </div>
        )}

        {!collapsed && generalAnalyses.length > 0 && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            Análisis de CV
          </p>
        )}

        {generalAnalyses.map((a) => (
          <a
            key={a.id}
            href={`/?analysis=${encodeURIComponent(a.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              group w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 text-left relative
              cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none
              ${collapsed ? "justify-center p-2" : "px-3 py-2.5"}
              ${
                activeId === a.id
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }
            `}
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeId === a.id
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "bg-zinc-800/60 text-zinc-500 group-hover:text-zinc-400"
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>

            {/* Text content */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">
                  {a.title || a.filename.replace(/\.pdf$/i, "")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(a.created_at)}
                  </span>
                  {a.ai_score !== null ? (
                    <span className="flex items-center gap-1">
                      <span
                        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${getScoreColor(a.ai_score)}`}
                      >
                        {a.ai_score}
                      </span>
                      {a.analysis_mode === "general" ? (
                        <FileSearch className="w-3 h-3 text-violet-400" />
                      ) : (
                        <Briefcase className="w-3 h-3 text-emerald-400" />
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-600 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Delete button */}
            {!collapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(a.id);
                }}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </a>
        ))}

        {!collapsed && jobAnalyses.length > 0 && (
          <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            Ofertas aplicadas
          </p>
        )}

        {jobAnalyses.map((a) => (
          <a
            key={a.id}
            href={`/?analysis=${encodeURIComponent(a.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              group w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 text-left relative
              cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none
              ${collapsed ? "justify-center p-2" : "px-3 py-2.5"}
              ${
                activeId === a.id
                  ? "bg-white/[0.08] text-zinc-100"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }
            `}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                activeId === a.id
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-zinc-800/60 text-zinc-500 group-hover:text-zinc-400"
              }`}
            >
              <Briefcase className="w-4 h-4" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">
                  {a.title || a.filename.replace(/\.pdf$/i, "")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(a.created_at)}
                  </span>
                  {a.ai_score !== null ? (
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${getScoreColor(a.ai_score)}`}
                    >
                      {a.ai_score}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-600 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(a.id);
                }}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06] shrink-0 space-y-3">
        <button
          onClick={onOpenSettings}
          className={`
            w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
            ${activeView === "settings" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"}
            ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
          `}
          title="Configuración"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`
              w-full flex items-center gap-2 rounded-lg font-medium transition-all duration-150
              ${activeView === "admin" ? "bg-emerald-500/10 text-emerald-200" : "text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"}
              ${collapsed ? "justify-center p-2" : "px-3 py-2.5 text-sm"}
            `}
            title="Observabilidad"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Observabilidad</span>}
          </button>
        )}
        {!collapsed && (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0 text-[11px] text-zinc-500">
              <UserCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{userEmail}</span>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
    </>
  );
}
