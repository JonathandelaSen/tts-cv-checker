import { NextRequest, NextResponse } from "next/server";
import { CV_PDFS_BUCKET, createCV } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import {
  createRequestId,
  getErrorCode,
  hasExtractedText,
  recordProcessingEvent,
  sanitizeErrorMessage,
} from "@/lib/observability";
import { extractPdfText } from "@/lib/pdf-extraction";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const requestId = createRequestId("parse");
  let userId: string | null = null;
  let cvId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const requestedName = String(formData.get("name") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    cvId = crypto.randomUUID();
    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "cv_upload",
      status: "started",
      source: "api_parse",
      fileSize: file.size,
      metadata: {
        filename: file.name,
        contentType: file.type,
      },
    });

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extracted = await extractPdfText(buffer, {
      userId,
      cvId,
      requestId,
      fileSize: file.size,
      filename: file.name,
    });

    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pdfStoragePath = `${user.id}/${cvId}-${safeFilename}`;
    const storageStartedAt = performance.now();
    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "storage_upload",
      status: "started",
      source: CV_PDFS_BUCKET,
      fileSize: file.size,
      metadata: { storagePath: pdfStoragePath },
    });

    const { error: uploadError } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .upload(pdfStoragePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      await recordProcessingEvent({
        userId,
        cvId,
        requestId,
        stage: "storage_upload",
        status: "error",
        source: CV_PDFS_BUCKET,
        durationMs: performance.now() - storageStartedAt,
        fileSize: file.size,
        errorCode: "storage_upload_failed",
        errorMessage: sanitizeErrorMessage(uploadError.message),
      });
      throw uploadError;
    }

    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "storage_upload",
      status: "success",
      source: CV_PDFS_BUCKET,
      durationMs: performance.now() - storageStartedAt,
      fileSize: file.size,
    });

    const cv = await createCV(supabase, {
      id: cvId,
      user_id: user.id,
      name: requestedName || file.name.replace(/\.pdf$/i, ""),
      filename: file.name,
      file_size: file.size,
      pdf_storage_path: pdfStoragePath,
      ...extracted,
    });

    const texts = [cv.text_python, cv.text_pdfjs, cv.text_node];
    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "cv_upload",
      status: hasExtractedText(texts) ? "success" : "warning",
      source: "api_parse",
      fileSize: file.size,
      textLength: Math.max(
        cv.text_python?.length ?? 0,
        cv.text_pdfjs?.length ?? 0,
        cv.text_node?.length ?? 0
      ),
      errorCode: hasExtractedText(texts) ? null : "no_extracted_text_available",
      errorMessage: hasExtractedText(texts)
        ? null
        : "CV uploaded, but no parser produced usable text.",
      metadata: {
        filename: cv.filename,
      },
    });

    return NextResponse.json({
      id: cv.id,
      cvId: cv.id,
      filename: cv.filename,
      created_at: cv.created_at,
      texts: {
        python: cv.text_python,
        pdfjs: cv.text_pdfjs,
        node: cv.text_node,
      },
      errors: {
        python: cv.extract_error_python,
        pdfjs: cv.extract_error_pdfjs,
        node: cv.extract_error_node,
      },
    });
  } catch (error: unknown) {
    console.error("API error:", error);
    await recordProcessingEvent({
      userId,
      cvId,
      requestId,
      stage: "cv_upload",
      status: "error",
      source: "api_parse",
      errorCode: getErrorCode(error),
      errorMessage: sanitizeErrorMessage(error),
    });
    return NextResponse.json(
      { error: "Internal server error", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
