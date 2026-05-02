import { NextRequest, NextResponse } from "next/server";
import {
  CV_PDFS_BUCKET,
  createAnalysis,
  deleteAnalysis,
  getCV,
  listAnalyses,
  updateCVExtraction,
  type CVRecord,
  type AIContext,
  type AnalysisMode,
} from "@/lib/db";
import { scoreCVWithAI } from "@/lib/ai-scoring";
import { getErrorMessage } from "@/lib/errors";
import { extractPdfText } from "@/lib/pdf-extraction";
import {
  createRequestId,
  getErrorCode,
  hasExtractedText,
  recordProcessingEvent,
  sanitizeErrorMessage,
} from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

async function getAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function retryCVExtraction(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  cv: CVRecord;
  userId: string;
  requestId: string;
}) {
  if (
    hasExtractedText([
      input.cv.text_python,
      input.cv.text_pdfjs,
      input.cv.text_node,
    ]) ||
    !input.cv.pdf_storage_path
  ) {
    return input.cv;
  }

  const { data, error } = await input.supabase.storage
    .from(CV_PDFS_BUCKET)
    .download(input.cv.pdf_storage_path);

  if (error) throw error;

  const extracted = await extractPdfText(Buffer.from(await data.arrayBuffer()), {
    userId: input.userId,
    cvId: input.cv.id,
    requestId: input.requestId,
    fileSize: input.cv.file_size,
    filename: input.cv.filename,
    pdfStoragePath: input.cv.pdf_storage_path,
  });

  return (
    (await updateCVExtraction(
      input.supabase,
      input.cv.id,
      input.userId,
      extracted
    )) ?? input.cv
  );
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = await listAnalyses(supabase, user.id);
    return NextResponse.json(analyses);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId("analysis");
  let userId: string | null = null;
  let cvIdForEvents: string | null = null;
  let analysisIdForEvents: string | null = null;
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const {
      cvId,
      title,
      mode = "general",
      jobDescription,
      jobUrl,
      context,
      model = "gemini-2.5-flash",
      geminiApiKey,
    } = (await req.json()) as {
      cvId?: string;
      title?: string;
      mode?: AnalysisMode;
      jobDescription?: string;
      jobUrl?: string;
      context?: AIContext;
      model?: string;
      geminiApiKey?: string;
    };

    const trimmedTitle = title?.trim();
    if (!cvId) {
      return NextResponse.json({ error: "cvId is required" }, { status: 400 });
    }
    cvIdForEvents = cvId;
    if (!trimmedTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
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

    let cv = await getCV(supabase, cvId, user.id);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    cv = await retryCVExtraction({
      supabase,
      cv,
      userId: user.id,
      requestId,
    });

    const text = cv.text_python || cv.text_pdfjs || cv.text_node;
    if (!text) {
      await recordProcessingEvent({
        userId,
        cvId,
        requestId,
        stage: "analysis_preflight",
        status: "error",
        source: "api_analyses",
        fileSize: cv.file_size,
        errorCode: "no_extracted_text_available",
        errorMessage: "No extracted text available for this CV.",
        metadata: {
          filename: cv.filename,
          pythonLength: cv.text_python?.length ?? 0,
          pdfjsLength: cv.text_pdfjs?.length ?? 0,
          nodeLength: cv.text_node?.length ?? 0,
          pythonError: Boolean(cv.extract_error_python),
          pdfjsError: Boolean(cv.extract_error_pdfjs),
          nodeError: Boolean(cv.extract_error_node),
        },
      });
      return NextResponse.json(
        { error: "No extracted text available for this CV" },
        { status: 400 }
      );
    }

    analysisIdForEvents = crypto.randomUUID();
    const result = await scoreCVWithAI({
      apiKey: geminiApiKey.trim(),
      mode,
      text,
      model,
      context: mode === "general" ? (context ?? null) : null,
      jobDescription: mode === "job_match" ? jobDescription : null,
      jobUrl: mode === "job_match" ? jobUrl : null,
      observability: {
        userId,
        cvId,
        analysisId: analysisIdForEvents,
        requestId,
      },
    });

    const persistStartedAt = performance.now();
    await recordProcessingEvent({
      userId,
      cvId,
      analysisId: analysisIdForEvents,
      requestId,
      stage: "analysis_persist",
      status: "started",
      source: "api_analyses",
      metadata: {
        mode,
        model,
      },
    });

    const analysis = await createAnalysis(supabase, {
      id: analysisIdForEvents,
      user_id: user.id,
      cv_id: cv.id,
      title: trimmedTitle,
      filename: cv.filename,
      file_size: cv.file_size,
      pdf_storage_path: cv.pdf_storage_path,
      text_python: cv.text_python,
      text_pdfjs: cv.text_pdfjs,
      text_node: cv.text_node,
      extract_error_python: cv.extract_error_python,
      extract_error_pdfjs: cv.extract_error_pdfjs,
      extract_error_node: cv.extract_error_node,
      analysis_mode: mode,
      ai_model: model,
      job_description: mode === "job_match" ? jobDescription?.trim() ?? null : null,
      job_url: mode === "job_match" ? jobUrl?.trim() || null : null,
      ai_context: mode === "general" ? (context ?? null) : null,
      ai_score: result.score,
      ai_feedback: result.feedback,
      ai_keywords: result.keywordsFound,
      ai_improvements: result.improvements,
      job_key_data: result.jobKeyData,
      job_keywords: result.jobKeywords,
      cv_keywords: result.cvKeywords,
      matching_keywords: result.matchingKeywords,
      missing_keywords: result.missingKeywords,
    });

    await recordProcessingEvent({
      userId,
      cvId,
      analysisId: analysis.id,
      requestId,
      stage: "analysis_persist",
      status: "success",
      source: "api_analyses",
      durationMs: performance.now() - persistStartedAt,
      metadata: {
        mode,
        model,
        score: analysis.ai_score,
      },
    });

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Create analysis error:", error);
    await recordProcessingEvent({
      userId,
      cvId: cvIdForEvents,
      analysisId: analysisIdForEvents,
      requestId,
      stage: "analysis_request",
      status: "error",
      source: "api_analyses",
      errorCode: getErrorCode(error),
      errorMessage: sanitizeErrorMessage(error),
    });
    return NextResponse.json(
      { error: "Failed to create analysis", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = await listAnalyses(supabase, user.id);
    for (const a of analyses) {
      await deleteAnalysis(supabase, a.id, user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
