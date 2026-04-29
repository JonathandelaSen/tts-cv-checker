import { NextRequest, NextResponse } from "next/server";
import {
  getAnalysis,
  updateAnalysisWithAI,
  type AIContext,
  type AnalysisMode,
} from "@/lib/db";
import { scoreCVWithAI } from "@/lib/ai-scoring";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      analysisId,
      mode = "job_match" as AnalysisMode,
      jobDescription,
      jobUrl,
      context,
      model = "gemini-2.5-flash",
    } = (await req.json()) as {
      analysisId?: string;
      mode?: AnalysisMode;
      jobDescription?: string;
      jobUrl?: string;
      context?: AIContext;
      model?: string;
    };

    if (!analysisId) {
      return NextResponse.json(
        { error: "No analysisId provided" },
        { status: 400 }
      );
    }

    if (mode === "job_match" && !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Job description is required for job match mode" },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(supabase, analysisId);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    const text =
      analysis.text_python || analysis.text_pdfjs || analysis.text_node;
    if (!text) {
      return NextResponse.json(
        { error: "No extracted text available for this analysis" },
        { status: 400 }
      );
    }

    const parsedResult = await scoreCVWithAI({
      mode,
      text,
      model,
      context: mode === "general" ? (context ?? null) : null,
      jobDescription: mode === "job_match" ? jobDescription : null,
      jobUrl: mode === "job_match" ? jobUrl : null,
    });

    const updated = await updateAnalysisWithAI(supabase, analysisId, {
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

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Gemini ATS Error:", error);
    return NextResponse.json(
      { error: "Failed to score CV with ATS", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
