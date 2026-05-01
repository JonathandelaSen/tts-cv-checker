import { NextRequest, NextResponse } from "next/server";
import {
  getAnalysis,
  updateAnalysisWithAI,
  type AIContext,
  type AnalysisMode,
} from "@/lib/db";
import { scoreCVWithAI } from "@/lib/ai-scoring";
import { getErrorMessage } from "@/lib/errors";
import {
  createRequestId,
  getErrorCode,
  recordProcessingEvent,
  sanitizeErrorMessage,
} from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const requestId = createRequestId("score");
  let userId: string | null = null;
  let analysisIdForEvents: string | null = null;
  let cvIdForEvents: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const {
      analysisId,
      mode = "job_match" as AnalysisMode,
      jobDescription,
      jobUrl,
      context,
      model = "gemini-2.5-flash",
      geminiApiKey,
    } = (await req.json()) as {
      analysisId?: string;
      mode?: AnalysisMode;
      jobDescription?: string;
      jobUrl?: string;
      context?: AIContext;
      model?: string;
      geminiApiKey?: string;
    };

    if (!analysisId) {
      return NextResponse.json(
        { error: "No analysisId provided" },
        { status: 400 }
      );
    }
    analysisIdForEvents = analysisId;

    if (mode === "job_match" && !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Job description is required for job match mode" },
        { status: 400 }
      );
    }

    if (!geminiApiKey?.trim()) {
      return NextResponse.json(
        {
          error:
            "Configura tu API key de Gemini en Configuración antes de lanzar el análisis.",
        },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(supabase, analysisId, user.id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    cvIdForEvents = analysis.cv_id;

    const text =
      analysis.text_python || analysis.text_pdfjs || analysis.text_node;
    if (!text) {
      await recordProcessingEvent({
        userId,
        cvId: analysis.cv_id,
        analysisId,
        requestId,
        stage: "analysis_preflight",
        status: "error",
        source: "api_score",
        fileSize: analysis.file_size,
        errorCode: "no_extracted_text_available",
        errorMessage: "No extracted text available for this analysis.",
        metadata: {
          filename: analysis.filename,
          pythonLength: analysis.text_python?.length ?? 0,
          pdfjsLength: analysis.text_pdfjs?.length ?? 0,
          nodeLength: analysis.text_node?.length ?? 0,
          pythonError: Boolean(analysis.extract_error_python),
          pdfjsError: Boolean(analysis.extract_error_pdfjs),
          nodeError: Boolean(analysis.extract_error_node),
        },
      });
      return NextResponse.json(
        { error: "No extracted text available for this analysis" },
        { status: 400 }
      );
    }

    const parsedResult = await scoreCVWithAI({
      apiKey: geminiApiKey.trim(),
      mode,
      text,
      model,
      context: mode === "general" ? (context ?? null) : null,
      jobDescription: mode === "job_match" ? jobDescription : null,
      jobUrl: mode === "job_match" ? jobUrl : null,
      observability: {
        userId,
        cvId: analysis.cv_id,
        analysisId,
        requestId,
      },
    });

    const persistStartedAt = performance.now();
    await recordProcessingEvent({
      userId,
      cvId: analysis.cv_id,
      analysisId,
      requestId,
      stage: "analysis_persist",
      status: "started",
      source: "api_score",
      metadata: {
        mode,
        model,
      },
    });

    const updated = await updateAnalysisWithAI(supabase, analysisId, user.id, {
      analysis_mode: mode,
      ai_model: model,
      job_description: mode === "job_match" ? jobDescription?.trim() ?? null : null,
      job_url: mode === "job_match" ? jobUrl?.trim() || null : null,
      ai_context: mode === "general" ? (context ?? null) : null,
      ai_score: parsedResult.score,
      ai_feedback: parsedResult.feedback,
      ai_keywords: parsedResult.keywordsFound,
      ai_improvements: parsedResult.improvements,
      job_key_data: parsedResult.jobKeyData,
      job_keywords: parsedResult.jobKeywords,
      cv_keywords: parsedResult.cvKeywords,
      matching_keywords: parsedResult.matchingKeywords,
      missing_keywords: parsedResult.missingKeywords,
    });

    await recordProcessingEvent({
      userId,
      cvId: analysis.cv_id,
      analysisId,
      requestId,
      stage: "analysis_persist",
      status: updated ? "success" : "warning",
      source: "api_score",
      durationMs: performance.now() - persistStartedAt,
      errorCode: updated ? null : "analysis_update_missing",
      errorMessage: updated ? null : "Analysis update returned no row.",
      metadata: {
        mode,
        model,
        score: updated?.ai_score ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Gemini ATS Error:", error);
    await recordProcessingEvent({
      userId,
      cvId: cvIdForEvents,
      analysisId: analysisIdForEvents,
      requestId,
      stage: "analysis_request",
      status: "error",
      source: "api_score",
      errorCode: getErrorCode(error),
      errorMessage: sanitizeErrorMessage(error),
    });
    return NextResponse.json(
      { error: "Failed to score CV with ATS", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
