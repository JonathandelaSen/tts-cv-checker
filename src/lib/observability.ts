import "server-only";

import { getErrorMessage } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProcessingEventStatus = "started" | "success" | "warning" | "error";

export interface ProcessingEventInput {
  userId?: string | null;
  cvId?: string | null;
  analysisId?: string | null;
  requestId: string;
  stage: string;
  status: ProcessingEventStatus;
  source?: string | null;
  durationMs?: number | null;
  fileSize?: number | null;
  textLength?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProcessingEvent {
  id: string;
  user_id: string | null;
  cv_id: string | null;
  analysis_id: string | null;
  request_id: string;
  stage: string;
  status: ProcessingEventStatus;
  source: string | null;
  duration_ms: number | null;
  file_size: number | null;
  text_length: number | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProcessingEventFilters {
  status?: string | null;
  stage?: string | null;
  cvId?: string | null;
  analysisId?: string | null;
  requestId?: string | null;
  limit?: number;
}

const MAX_ERROR_LENGTH = 700;
const MAX_METADATA_STRING_LENGTH = 300;
const MAX_METADATA_DEPTH = 3;

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function createRequestId(prefix = "req") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sanitizeErrorMessage(message: unknown) {
  return truncateForEvent(getErrorMessage(message))
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim();
}

export function getErrorCode(error: unknown) {
  if (error instanceof Error) return error.name || "Error";
  return "UnknownError";
}

export function getTextLength(text: string | null | undefined) {
  return text?.trim().length ?? 0;
}

export function hasExtractedText(texts: Array<string | null | undefined>) {
  return texts.some((text) => getTextLength(text) > 0);
}

export async function recordProcessingEvent(input: ProcessingEventInput) {
  const event = normalizeEvent(input);
  logProcessingEvent(event);

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("processing_events").insert({
      user_id: event.userId,
      cv_id: event.cvId,
      analysis_id: event.analysisId,
      request_id: event.requestId,
      stage: event.stage,
      status: event.status,
      source: event.source,
      duration_ms: event.durationMs,
      file_size: event.fileSize,
      text_length: event.textLength,
      error_code: event.errorCode,
      error_message: event.errorMessage,
      metadata: event.metadata,
    });

    if (error) {
      const insertError = normalizeSupabaseError(error);
      console.error(
        JSON.stringify({
          event: "processing_event_insert_failed",
          request_id: event.requestId,
          stage: event.stage,
          error: insertError.message,
          error_code: insertError.code,
          error_details: insertError.details,
          error_hint: insertError.hint,
        })
      );
    }
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        event: "processing_event_insert_failed",
        request_id: event.requestId,
        stage: event.stage,
        error: sanitizeErrorMessage(error),
      })
    );
  }
}

function normalizeSupabaseError(error: SupabaseErrorLike) {
  return {
    message: sanitizeErrorMessage(error.message ?? error),
    code: error.code ? sanitizeErrorMessage(error.code) : null,
    details: error.details ? sanitizeErrorMessage(error.details) : null,
    hint: error.hint ? sanitizeErrorMessage(error.hint) : null,
  };
}

export async function isAdminUser(userId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        JSON.stringify({
          event: "admin_lookup_failed",
          user_id: userId,
          error: sanitizeErrorMessage(error.message),
        })
      );
      return false;
    }

    return Boolean(data);
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        event: "admin_lookup_failed",
        user_id: userId,
        error: sanitizeErrorMessage(error),
      })
    );
    return false;
  }
}

export async function listProcessingEvents(filters: ProcessingEventFilters) {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  let query = admin
    .from("processing_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.cvId) query = query.eq("cv_id", filters.cvId);
  if (filters.analysisId) query = query.eq("analysis_id", filters.analysisId);
  if (filters.requestId) query = query.eq("request_id", filters.requestId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProcessingEvent[];
}

function normalizeEvent(input: ProcessingEventInput) {
  return {
    userId: input.userId ?? null,
    cvId: input.cvId ?? null,
    analysisId: input.analysisId ?? null,
    requestId: input.requestId,
    stage: input.stage,
    status: input.status,
    source: input.source ?? null,
    durationMs: normalizeNumber(input.durationMs),
    fileSize: normalizeNumber(input.fileSize),
    textLength: normalizeNumber(input.textLength),
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage
      ? truncateForEvent(input.errorMessage)
      : null,
    metadata: sanitizeMetadata(input.metadata ?? {}) as Record<string, unknown>,
  };
}

function logProcessingEvent(event: ReturnType<typeof normalizeEvent>) {
  const log = event.status === "error" ? console.error : console.log;
  log(
    JSON.stringify({
      event: "processing_event",
      request_id: event.requestId,
      user_id: event.userId,
      cv_id: event.cvId,
      analysis_id: event.analysisId,
      stage: event.stage,
      status: event.status,
      source: event.source,
      duration_ms: event.durationMs,
      file_size: event.fileSize,
      text_length: event.textLength,
      error_code: event.errorCode,
    })
  );
}

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > MAX_METADATA_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof value !== "object") return String(value);

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (
      /api.?key|authorization|prompt|contents|raw|cv.?text|full.?text|file.?buffer|pdf.?buffer|base64/i.test(
        key
      )
    ) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = sanitizeMetadata(nestedValue, depth + 1);
  }

  return output;
}

function normalizeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function truncateForEvent(message: string) {
  return message.slice(0, MAX_ERROR_LENGTH);
}
