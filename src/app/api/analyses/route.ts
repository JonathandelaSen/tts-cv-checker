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
import { getCVTemplate, type CVTemplateId, type CVTemplateLocale } from "@/lib/cv-templates";
import { renderTemplatePDF } from "@/lib/cv-template-pdf";
import { getErrorMessage } from "@/lib/errors";
import { getBestCVText } from "@/lib/cv-profile";
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

function getTemplateAnalysisFilename(cv: CVRecord) {
  const baseName = cv.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "template-cv";
  return `${baseName}.pdf`;
}

async function extractTemplateCVPdf(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  cv: CVRecord;
  userId: string;
  requestId: string;
}) {
  if (!input.cv.profile || !input.cv.template_id) {
    throw new Error("Template CV has no profile or template.");
  }

  const template = getCVTemplate(input.cv.template_id);
  if (!template) {
    throw new Error("Template not found.");
  }

  const filename = getTemplateAnalysisFilename(input.cv);
  const renderStartedAt = performance.now();
  await recordProcessingEvent({
    userId: input.userId,
    cvId: input.cv.id,
    requestId: input.requestId,
    stage: "template_pdf_render",
    status: "started",
    source: "api_analyses",
    metadata: {
      filename,
      templateId: template.templateId,
      locale: input.cv.template_locale,
    },
  });

  const templatePdfBuffer = await renderTemplatePDF({
    profile: input.cv.profile,
    templateId: template.templateId as CVTemplateId,
    locale: (input.cv.template_locale ?? "es") as CVTemplateLocale,
  });

  await recordProcessingEvent({
    userId: input.userId,
    cvId: input.cv.id,
    requestId: input.requestId,
    stage: "template_pdf_render",
    status: "success",
    source: "api_analyses",
    durationMs: performance.now() - renderStartedAt,
    fileSize: templatePdfBuffer.length,
    metadata: {
      filename,
      templateId: template.templateId,
    },
  });

  const pdfStoragePath = `${input.userId}/${input.cv.id}-${input.requestId}-template.pdf`;
  const storageStartedAt = performance.now();
  await recordProcessingEvent({
    userId: input.userId,
    cvId: input.cv.id,
    requestId: input.requestId,
    stage: "storage_upload",
    status: "started",
    source: CV_PDFS_BUCKET,
    fileSize: templatePdfBuffer.length,
    metadata: {
      storagePath: pdfStoragePath,
      temporary: true,
    },
  });

  const { error: uploadError } = await input.supabase.storage
    .from(CV_PDFS_BUCKET)
    .upload(pdfStoragePath, templatePdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    await recordProcessingEvent({
      userId: input.userId,
      cvId: input.cv.id,
      requestId: input.requestId,
      stage: "storage_upload",
      status: "error",
      source: CV_PDFS_BUCKET,
      durationMs: performance.now() - storageStartedAt,
      fileSize: templatePdfBuffer.length,
      errorCode: "storage_upload_failed",
      errorMessage: sanitizeErrorMessage(uploadError.message),
      metadata: {
        storagePath: pdfStoragePath,
        temporary: true,
      },
    });
    throw uploadError;
  }

  await recordProcessingEvent({
    userId: input.userId,
    cvId: input.cv.id,
    requestId: input.requestId,
    stage: "storage_upload",
    status: "success",
    source: CV_PDFS_BUCKET,
    durationMs: performance.now() - storageStartedAt,
    fileSize: templatePdfBuffer.length,
    metadata: {
      storagePath: pdfStoragePath,
      temporary: true,
    },
  });

  try {
    const extracted = await extractPdfText(templatePdfBuffer, {
      userId: input.userId,
      cvId: input.cv.id,
      requestId: input.requestId,
      fileSize: templatePdfBuffer.length,
      filename,
      pdfStoragePath,
    });

    return {
      extracted,
      filename,
      fileSize: templatePdfBuffer.length,
    };
  } finally {
    await input.supabase.storage
      .from(CV_PDFS_BUCKET)
      .remove([pdfStoragePath])
      .catch(() => {});
  }
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
      model = "gemini-3.1-pro-preview",
    } = (await req.json()) as {
      cvId?: string;
      title?: string;
      mode?: AnalysisMode;
      jobDescription?: string;
      jobUrl?: string;
      context?: AIContext;
      model?: string;
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

    const templatePdfExtraction =
      cv.type === "template"
        ? await extractTemplateCVPdf({
            supabase,
            cv,
            userId: user.id,
            requestId,
          })
        : null;
    const analysisExtraction = templatePdfExtraction?.extracted ?? {
      text_python: cv.text_python,
      text_pdfjs: cv.text_pdfjs,
      text_node: cv.text_node,
      extract_error_python: cv.extract_error_python,
      extract_error_pdfjs: cv.extract_error_pdfjs,
      extract_error_node: cv.extract_error_node,
    };
    const analysisText = getBestCVText(analysisExtraction);
    const cvTextSource = templatePdfExtraction
      ? "template_pdf_parse"
      : analysisText
        ? "stored_pdf_text"
        : "no_text_available";

    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "cv_text_extraction",
      status: analysisText ? "success" : "warning",
      source: cvTextSource,
      fileSize: templatePdfExtraction?.fileSize ?? cv.file_size,
      textLength: analysisText?.trim().length ?? 0,
      errorCode: analysisText ? null : "no_extracted_text_available",
      errorMessage: analysisText
        ? null
        : "No parser produced usable text for this CV.",
      metadata: {
        cvType: cv.type,
        filename: templatePdfExtraction?.filename ?? cv.filename,
        pythonLength: analysisExtraction.text_python?.trim().length ?? 0,
        pdfjsLength: analysisExtraction.text_pdfjs?.trim().length ?? 0,
        nodeLength: analysisExtraction.text_node?.trim().length ?? 0,
        pythonError: Boolean(analysisExtraction.extract_error_python),
        pdfjsError: Boolean(analysisExtraction.extract_error_pdfjs),
        nodeError: Boolean(analysisExtraction.extract_error_node),
        templateId: cv.template_id,
      },
    });

    if (!analysisText) {
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
          filename: templatePdfExtraction?.filename ?? cv.filename,
          pythonLength: analysisExtraction.text_python?.length ?? 0,
          pdfjsLength: analysisExtraction.text_pdfjs?.length ?? 0,
          nodeLength: analysisExtraction.text_node?.length ?? 0,
          pythonError: Boolean(analysisExtraction.extract_error_python),
          pdfjsError: Boolean(analysisExtraction.extract_error_pdfjs),
          nodeError: Boolean(analysisExtraction.extract_error_node),
        },
      });
      return NextResponse.json(
        { error: "No extracted text available for this CV" },
        { status: 400 }
      );
    }

    analysisIdForEvents = crypto.randomUUID();
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
      filename: templatePdfExtraction?.filename ?? cv.filename ?? "",
      file_size: templatePdfExtraction?.fileSize ?? cv.file_size,
      pdf_storage_path: cv.pdf_storage_path,
      text_python: analysisExtraction.text_python,
      text_pdfjs: analysisExtraction.text_pdfjs,
      text_node: analysisExtraction.text_node,
      extract_error_python: analysisExtraction.extract_error_python,
      extract_error_pdfjs: analysisExtraction.extract_error_pdfjs,
      extract_error_node: analysisExtraction.extract_error_node,
      analysis_mode: mode,
      ai_model: model,
      job_description: mode === "job_match" ? jobDescription?.trim() ?? null : null,
      job_url: mode === "job_match" ? jobUrl?.trim() || null : null,
      ai_context: mode === "general" ? (context ?? null) : null,
      ai_score: null,
      ai_feedback: null,
      ai_keywords: null,
      ai_improvements: null,
      job_key_data: null,
      job_keywords: [],
      cv_keywords: [],
      matching_keywords: [],
      missing_keywords: [],
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
