import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CV_PROFILE_SCHEMA_VERSION,
  normalizeStandardCVProfile,
  type StandardCVProfile,
} from "@/lib/cv-profile";
import type { ExtractedPdfText } from "@/lib/pdf-extraction";

export const CV_PDFS_BUCKET = "cv-pdfs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalysisMode = "general" | "job_match";

export interface AIContext {
  additionalContext?: string;
}

export interface JobKeyData {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  remote?: string | null;
  salary?: string | null;
  seniority?: string | null;
  contractType?: string | null;
  benefits?: string[];
  requirements?: string[];
  responsibilities?: string[];
  notablePoints?: string[];
}

export type CVType = "uploaded" | "template";

export interface CVRecord extends ExtractedPdfText {
  id: string;
  user_id: string;
  name: string;
  filename: string | null;
  file_size: number | null;
  pdf_storage_path: string | null;
  type: CVType;
  source_cv_id: string | null;
  template_id: string | null;
  template_locale: string | null;
  schema_version: string | null;
  source_text_hash: string | null;
  ai_model: string | null;
  profile: StandardCVProfile | null;
  created_at: string;
  updated_at: string;
}

export interface CVSummary {
  id: string;
  name: string;
  filename: string | null;
  file_size: number | null;
  type: CVType;
  source_cv_id: string | null;
  template_id: string | null;
  template_locale: string | null;
  profile: StandardCVProfile | null;
  created_at: string;
  updated_at: string;
}

export interface CVStructuredProfile {
  id: string;
  user_id: string;
  cv_id: string;
  schema_version: string;
  source_text_hash: string;
  ai_model: string;
  profile: StandardCVProfile;
  created_at: string;
  updated_at: string;
}

export interface Analysis extends ExtractedPdfText {
  id: string;
  user_id: string;
  cv_id: string | null;
  title: string;
  filename: string;
  file_size: number | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
  analysis_mode: AnalysisMode;
  ai_model: string | null;
  job_description: string | null;
  job_url: string | null;
  ai_context: AIContext | null;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_keywords: string | null; // JSON stringified array
  ai_improvements: string | null; // JSON stringified array
  job_key_data: string | null; // JSON stringified object
  job_keywords: string | null; // JSON stringified array
  cv_keywords: string | null; // JSON stringified array
  matching_keywords: string | null; // JSON stringified array
  missing_keywords: string | null; // JSON stringified array
  ai_analyzed_at: string | null;
  cv?: CVRecord | null;
}

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

export interface CVRecommendationAnalysis extends AnalysisSummary {
  ai_improvements: string | null;
  missing_keywords: string | null;
  ai_keywords: string | null;
}

export type DeleteCVResult =
  | { status: "deleted" }
  | { status: "in_use"; analyses: AnalysisSummary[] }
  | { status: "not_found" };

function stringifyJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizeAnalysis(row: Record<string, unknown>): Analysis {
  const cv = (row.cvs ?? row.cv ?? null) as CVRecord | null;

  return {
    ...(row as unknown as Analysis),
    cv,
    cv_id: ((row.cv_id as string | null) ?? cv?.id ?? null),
    title: ((row.title as string | null) ?? row.filename ?? "Análisis sin nombre") as string,
    filename: ((row.filename as string | null) ?? cv?.filename ?? "") as string,
    file_size: ((row.file_size as number | null) ?? cv?.file_size ?? null),
    pdf_storage_path:
      ((row.pdf_storage_path as string | null) ?? cv?.pdf_storage_path ?? null),
    text_python: ((row.text_python as string | null) ?? cv?.text_python ?? null),
    text_pdfjs: ((row.text_pdfjs as string | null) ?? cv?.text_pdfjs ?? null),
    text_node: ((row.text_node as string | null) ?? cv?.text_node ?? null),
    extract_error_python:
      ((row.extract_error_python as string | null) ??
        cv?.extract_error_python ??
        null),
    extract_error_pdfjs:
      ((row.extract_error_pdfjs as string | null) ??
        cv?.extract_error_pdfjs ??
        null),
    extract_error_node:
      ((row.extract_error_node as string | null) ?? cv?.extract_error_node ?? null),
    ai_keywords: stringifyJson(row.ai_keywords),
    ai_improvements: stringifyJson(row.ai_improvements),
    job_key_data: stringifyJson(row.job_key_data),
    job_keywords: stringifyJson(row.job_keywords),
    cv_keywords: stringifyJson(row.cv_keywords),
    matching_keywords: stringifyJson(row.matching_keywords),
    missing_keywords: stringifyJson(row.missing_keywords),
  };
}

// ---------------------------------------------------------------------------
// CV Helpers
// ---------------------------------------------------------------------------

export interface CreateCVInput extends Partial<ExtractedPdfText> {
  id: string;
  user_id: string;
  name: string;
  filename?: string | null;
  file_size?: number | null;
  pdf_storage_path?: string | null;
  type?: CVType;
  source_cv_id?: string | null;
  template_id?: string | null;
  template_locale?: string | null;
  schema_version?: string | null;
  source_text_hash?: string | null;
  ai_model?: string | null;
  profile?: StandardCVProfile | null;
}

export async function createCV(
  supabase: SupabaseClient,
  data: CreateCVInput
): Promise<CVRecord> {
  const { data: cv, error } = await supabase
    .from("cvs")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return cv as CVRecord;
}

export async function listCVs(
  supabase: SupabaseClient,
  userId: string
): Promise<CVSummary[]> {
  const { data, error } = await supabase
    .from("cvs")
    .select("id, name, filename, file_size, type, source_cv_id, template_id, template_locale, profile, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CVSummary[];
}

export async function getCV(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<CVRecord | null> {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as CVRecord | null) ?? null;
}

export async function updateCVName(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  name: string
): Promise<CVRecord | null> {
  const { data, error } = await supabase
    .from("cvs")
    .update({ name })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as CVRecord | null) ?? null;
}

export async function createTemplateCV(
  supabase: SupabaseClient,
  data: {
    user_id: string;
    source_cv_id: string;
    name: string;
    template_id: string;
    template_locale: string;
    schema_version: string;
    source_text_hash: string;
    ai_model: string;
    profile: StandardCVProfile;
  }
): Promise<CVRecord> {
  const { data: cv, error } = await supabase
    .from("cvs")
    .insert({ ...data, type: "template" as const })
    .select("*")
    .single();

  if (error) throw error;
  return cv as CVRecord;
}

export async function updateCVProfile(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  data: {
    profile?: StandardCVProfile;
    ai_model?: string;
    name?: string;
    template_locale?: string;
  }
): Promise<CVRecord | null> {
  const { data: cv, error } = await supabase
    .from("cvs")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("type", "template")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (cv as CVRecord | null) ?? null;
}

export async function updateCVExtraction(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  extracted: ExtractedPdfText
): Promise<CVRecord | null> {
  const { data, error } = await supabase
    .from("cvs")
    .update(extracted)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as CVRecord | null) ?? null;
}

export async function listAnalysesForCV(
  supabase: SupabaseClient,
  cvId: string,
  userId: string
): Promise<AnalysisSummary[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, cv_id, title, filename, created_at, analysis_mode, ai_score, ai_analyzed_at, job_url"
    )
    .eq("cv_id", cvId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnalysisSummary[];
}

export async function getLatestRecommendationAnalysisForCV(
  supabase: SupabaseClient,
  cvId: string,
  userId: string
): Promise<CVRecommendationAnalysis | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, cv_id, title, filename, created_at, analysis_mode, ai_score, ai_analyzed_at, job_url, ai_improvements, missing_keywords, ai_keywords"
    )
    .eq("cv_id", cvId)
    .eq("user_id", userId)
    .not("ai_score", "is", null)
    .order("ai_analyzed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as CVRecommendationAnalysis),
    ai_improvements: stringifyJson(data.ai_improvements),
    missing_keywords: stringifyJson(data.missing_keywords),
    ai_keywords: stringifyJson(data.ai_keywords),
  };
}

export async function deleteCV(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<DeleteCVResult> {
  const cv = await getCV(supabase, id, userId);
  if (!cv) return { status: "not_found" };

  if (cv.type === "uploaded") {
    const analyses = await listAnalysesForCV(supabase, id, userId);
    if (analyses.length > 0) return { status: "in_use", analyses };
  }

  if (cv.pdf_storage_path) {
    const { error: storageError } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .remove([cv.pdf_storage_path]);

    if (storageError) throw storageError;
  }

  const { error } = await supabase.from("cvs").delete().eq("id", id);
  if (error) throw error;
  return { status: "deleted" };
}

// ---------------------------------------------------------------------------
// Structured CV Profile Helpers
// ---------------------------------------------------------------------------

function normalizeStructuredProfile(
  row: Record<string, unknown>
): CVStructuredProfile {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    cv_id: row.cv_id as string,
    schema_version: row.schema_version as string,
    source_text_hash: row.source_text_hash as string,
    ai_model: row.ai_model as string,
    profile: normalizeStandardCVProfile(row.profile),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getCVStructuredProfile(
  supabase: SupabaseClient,
  cvId: string,
  userId: string,
  schemaVersion = CV_PROFILE_SCHEMA_VERSION
): Promise<CVStructuredProfile | null> {
  const { data, error } = await supabase
    .from("cv_structured_profiles")
    .select("*")
    .eq("cv_id", cvId)
    .eq("user_id", userId)
    .eq("schema_version", schemaVersion)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeStructuredProfile(data as Record<string, unknown>) : null;
}

export async function upsertCVStructuredProfile(
  supabase: SupabaseClient,
  data: {
    user_id: string;
    cv_id: string;
    schema_version?: string;
    source_text_hash: string;
    ai_model: string;
    profile: StandardCVProfile;
  }
): Promise<CVStructuredProfile> {
  const schemaVersion = data.schema_version ?? CV_PROFILE_SCHEMA_VERSION;
  const { data: profile, error } = await supabase
    .from("cv_structured_profiles")
    .upsert(
      {
        user_id: data.user_id,
        cv_id: data.cv_id,
        schema_version: schemaVersion,
        source_text_hash: data.source_text_hash,
        ai_model: data.ai_model,
        profile: data.profile,
      },
      { onConflict: "cv_id,schema_version" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return normalizeStructuredProfile(profile as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Analysis Helpers
// ---------------------------------------------------------------------------

export interface CreateAnalysisInput {
  id: string;
  user_id: string;
  cv_id: string;
  title: string;
  filename: string;
  file_size: number | null;
  pdf_storage_path: string | null;
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
  ai_keywords: string[] | null;
  ai_improvements: string[] | null;
  job_key_data?: JobKeyData | null;
  job_keywords?: string[];
  cv_keywords?: string[];
  matching_keywords?: string[];
  missing_keywords?: string[];
}

export async function createAnalysis(
  supabase: SupabaseClient,
  data: CreateAnalysisInput
): Promise<Analysis> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({
      ...data,
      job_key_data: data.job_key_data ?? null,
      job_keywords: data.job_keywords ?? [],
      cv_keywords: data.cv_keywords ?? [],
      matching_keywords: data.matching_keywords ?? [],
      missing_keywords: data.missing_keywords ?? [],
      ai_analyzed_at:
        typeof data.ai_score === "number" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAnalysis(analysis as Record<string, unknown>);
}

export interface UpdateAIInput {
  analysis_mode: AnalysisMode;
  ai_model: string;
  job_description: string | null;
  job_url?: string | null;
  ai_context: AIContext | null;
  ai_score: number;
  ai_feedback: string;
  ai_keywords: string[];
  ai_improvements: string[];
  job_key_data?: JobKeyData | null;
  job_keywords?: string[];
  cv_keywords?: string[];
  matching_keywords?: string[];
  missing_keywords?: string[];
}

export async function updateAnalysisWithAI(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  data: UpdateAIInput
): Promise<Analysis | null> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .update({
      analysis_mode: data.analysis_mode,
      ai_model: data.ai_model,
      job_description: data.job_description,
      job_url: data.job_url ?? null,
      ai_context: data.ai_context,
      ai_score: data.ai_score,
      ai_feedback: data.ai_feedback,
      ai_keywords: data.ai_keywords,
      ai_improvements: data.ai_improvements,
      job_key_data: data.job_key_data ?? null,
      job_keywords: data.job_keywords ?? [],
      cv_keywords: data.cv_keywords ?? data.ai_keywords,
      matching_keywords: data.matching_keywords ?? [],
      missing_keywords: data.missing_keywords ?? [],
      ai_analyzed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return analysis ? normalizeAnalysis(analysis as Record<string, unknown>) : null;
}

export async function getAnalysis(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<Analysis | null> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("*, cv:cvs(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return analysis ? normalizeAnalysis(analysis as Record<string, unknown>) : null;
}

export async function listAnalyses(
  supabase: SupabaseClient,
  userId: string
): Promise<AnalysisSummary[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, cv_id, title, filename, created_at, analysis_mode, ai_score, ai_analyzed_at, job_url"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnalysisSummary[];
}

export async function updateAnalysis(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  data: Partial<Pick<Analysis, "job_url" | "title">>
): Promise<Analysis | null> {
  const { data: analysis, error } = await supabase
    .from("analyses")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return analysis ? normalizeAnalysis(analysis as Record<string, unknown>) : null;
}

export async function deleteAnalysis(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<boolean> {
  const analysis = await getAnalysis(supabase, id, userId);
  if (!analysis) return false;

  const { error } = await supabase
    .from("analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  return true;
}
