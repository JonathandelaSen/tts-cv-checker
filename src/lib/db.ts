import type { SupabaseClient } from "@supabase/supabase-js";

export const CV_PDFS_BUCKET = "cv-pdfs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalysisMode = "general" | "job_match";

export interface AIContext {
  additionalContext?: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  filename: string;
  file_size: number | null;
  pdf_storage_path: string | null;
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
  ai_context: AIContext | null;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_keywords: string | null; // JSON stringified array
  ai_improvements: string | null; // JSON stringified array
  ai_analyzed_at: string | null;
}

export interface AnalysisSummary {
  id: string;
  filename: string;
  created_at: string;
  analysis_mode: AnalysisMode;
  ai_score: number | null;
  ai_analyzed_at: string | null;
}

// ---------------------------------------------------------------------------
// CRUD Helpers
// ---------------------------------------------------------------------------

export interface CreateAnalysisInput {
  id: string;
  user_id: string;
  filename: string;
  file_size: number | null;
  pdf_storage_path: string | null;
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
}

function normalizeAnalysis(row: Analysis): Analysis {
  return {
    ...row,
    ai_keywords: Array.isArray(row.ai_keywords)
      ? JSON.stringify(row.ai_keywords)
      : row.ai_keywords,
    ai_improvements: Array.isArray(row.ai_improvements)
      ? JSON.stringify(row.ai_improvements)
      : row.ai_improvements,
  };
}

export async function createAnalysis(
  supabase: SupabaseClient,
  data: CreateAnalysisInput
): Promise<Analysis> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAnalysis(analysis as Analysis);
}

export interface UpdateAIInput {
  analysis_mode: AnalysisMode;
  ai_model: string;
  job_description: string | null;
  ai_context: AIContext | null;
  ai_score: number;
  ai_feedback: string;
  ai_keywords: string[];
  ai_improvements: string[];
}

export async function updateAnalysisWithAI(
  supabase: SupabaseClient,
  id: string,
  data: UpdateAIInput
): Promise<Analysis | null> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .update({
      analysis_mode: data.analysis_mode,
      ai_model: data.ai_model,
      job_description: data.job_description,
      ai_context: data.ai_context,
      ai_score: data.ai_score,
      ai_feedback: data.ai_feedback,
      ai_keywords: data.ai_keywords,
      ai_improvements: data.ai_improvements,
      ai_analyzed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return analysis ? normalizeAnalysis(analysis as Analysis) : null;
}

export async function getAnalysis(
  supabase: SupabaseClient,
  id: string
): Promise<Analysis | null> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return analysis ? normalizeAnalysis(analysis as Analysis) : null;
}

export async function listAnalyses(
  supabase: SupabaseClient
): Promise<AnalysisSummary[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("id, filename, created_at, analysis_mode, ai_score, ai_analyzed_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnalysisSummary[];
}

export async function deleteAnalysis(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const analysis = await getAnalysis(supabase, id);
  if (!analysis) return false;

  if (analysis.pdf_storage_path) {
    const { error: storageError } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .remove([analysis.pdf_storage_path]);

    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("analyses").delete().eq("id", id);
  if (error) throw error;

  return true;
}
