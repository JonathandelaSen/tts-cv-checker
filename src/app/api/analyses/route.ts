import { NextRequest, NextResponse } from "next/server";
import {
  createAnalysis,
  deleteAnalysis,
  getCV,
  listAnalyses,
  type AIContext,
  type AnalysisMode,
} from "@/lib/db";
import { scoreCVWithAI } from "@/lib/ai-scoring";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

async function getAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = await listAnalyses(supabase);
    return NextResponse.json(analyses);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const cv = await getCV(supabase, cvId);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const text = cv.text_python || cv.text_pdfjs || cv.text_node;
    if (!text) {
      return NextResponse.json(
        { error: "No extracted text available for this CV" },
        { status: 400 }
      );
    }

    const result = await scoreCVWithAI({
      apiKey: geminiApiKey.trim(),
      mode,
      text,
      model,
      context: mode === "general" ? (context ?? null) : null,
      jobDescription: mode === "job_match" ? jobDescription : null,
      jobUrl: mode === "job_match" ? jobUrl : null,
    });

    const analysis = await createAnalysis(supabase, {
      id: crypto.randomUUID(),
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

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Create analysis error:", error);
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

    const analyses = await listAnalyses(supabase);
    for (const a of analyses) {
      await deleteAnalysis(supabase, a.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
