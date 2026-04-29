import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import {
  getAnalysis,
  updateAnalysisWithAI,
  type AnalysisMode,
  type AIContext,
} from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface ScoreResponse {
  score: number;
  feedback: string;
  keywordsFound?: string[];
  improvements?: string[];
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildGeneralPrompt(context: AIContext | null): string {
  const contextLines: string[] = [];

  if (context?.additionalContext) contextLines.push(`- Additional context from the user: ${context.additionalContext}`);

  const contextBlock = contextLines.length > 0
    ? `\nThe user provided the following context about their profile:\n${contextLines.join("\n")}\nUse this information to tailor your general evaluation without assuming a specific role.\n`
    : "";

  return `You are a senior CV/Resume consultant and ATS (Applicant Tracking System) expert. Your task is to perform a comprehensive general evaluation of the extracted text from a PDF resume.
${contextBlock}
Evaluate the following aspects:

1. **ATS Readability**: Is the structure parseable by automated systems? Check for proper headings, bullet points, standard section names (Experience, Education, Skills, etc.), and any formatting issues that could confuse an ATS.
2. **Text Extraction Quality**: Are there garbled characters, encoding issues, or layout artifacts that indicate a poorly formatted PDF?
3. **Structure & Organization**: Is the CV well-organized? Does it follow a logical flow? Are sections clearly delimited?
4. **Content Clarity**: Are descriptions clear, concise, and impactful? Do they use action verbs and quantifiable results?
5. **Keywords & Skills**: Are relevant keywords present for the profile described in the CV? Are hard and soft skills well represented?
6. **Length & Conciseness**: Is the CV an appropriate length? Is there filler or redundancy?
7. **Language Consistency**: Is the language consistent throughout (no mixed languages unless intentional)?
8. **Dates & Timeline**: Are dates formatted consistently? Is there a clear career progression?

You must respond ONLY with a valid JSON using the following exact format:
{
  "score": <number from 0 to 100>,
  "feedback": "<Comprehensive summary of the CV's strengths and weaknesses. Be specific and actionable. Reply in Spanish.>",
  "keywordsFound": ["<relevant keyword or skill found>", ...],
  "improvements": ["<specific, actionable improvement in Spanish>", ...]
}`;
}

function buildJobMatchPrompt(jobDescription: string): string {
  return `You are a strict ATS (Applicant Tracking System) recruiter. Your task is to compare the extracted text from a PDF resume against a specific job posting and determine how well the candidate fits.

The job description is:
---
${jobDescription}
---

Evaluate the following aspects:

1. **Keyword Match**: Which keywords and requirements from the job description appear in the resume? Which critical ones are missing?
2. **Skills Gap Analysis**: What required skills does the candidate have? What required skills are missing?
3. **Experience Relevance**: How relevant is the candidate's experience to what the job requires?
4. **Qualifications Fit**: Does the candidate meet the education, certification, or years-of-experience requirements?
5. **Overall Fit Score**: Considering all factors, how well does this resume match the job posting?

You must respond ONLY with a valid JSON using the following exact format:
{
  "score": <number from 0 to 100, where 100 means perfect match>,
  "feedback": "<Detailed analysis of how well the resume matches the job posting. Highlight the strongest matches and the biggest gaps. Reply in Spanish.>",
  "keywordsFound": ["<keyword from job description found in resume>", ...],
  "improvements": ["<specific change to better match this job posting, in Spanish>", ...]
}`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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
      context,
      model = "gemini-2.5-flash",
    } = await req.json();

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

    // Pick the best extracted text
    const text =
      analysis.text_python || analysis.text_pdfjs || analysis.text_node;
    if (!text) {
      return NextResponse.json(
        { error: "No extracted text available for this analysis" },
        { status: 400 }
      );
    }

    const systemPrompt =
      mode === "general"
        ? buildGeneralPrompt(context ?? null)
        : buildJobMatchPrompt(jobDescription);

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: text }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText) as ScoreResponse;

    // Save AI results to DB
    const updated = await updateAnalysisWithAI(supabase, analysisId, {
      analysis_mode: mode,
      ai_model: model,
      job_description: mode === "job_match" ? jobDescription : null,
      ai_context: mode === "general" ? (context ?? null) : null,
      ai_score: parsedResult.score,
      ai_feedback: parsedResult.feedback,
      ai_keywords: parsedResult.keywordsFound || [],
      ai_improvements: parsedResult.improvements || [],
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
