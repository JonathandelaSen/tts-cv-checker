import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, updateAnalysisWithAI } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      analysisId,
      jobDescription,
      model = "gemini-2.5-flash",
    } = await req.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "No analysisId provided" },
        { status: 400 }
      );
    }

    const analysis = getAnalysis(analysisId);
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

    const systemPrompt = `You are a strict ATS (Applicant Tracking System). Your job is to analyze the extracted text from a PDF resume and evaluate it.
${jobDescription ? `\nThe user provided the following job description:\n${jobDescription}\nStrictly compare the resume against this job description.` : `No job description was provided. Perform a general evaluation of structure, ATS readability, and clarity of skills.`}

You must respond ONLY with a valid JSON using the following exact format:
{
  "score": <number from 0 to 100>,
  "feedback": "<Concise and direct summary of how well the text was extracted (e.g. if there are weird characters) and how it fits what an ATS looks for. (Reply in Spanish)>",
  "keywordsFound": ["<keyword 1>", "<keyword 2>"],
  "improvements": ["<concise improvement 1 in Spanish>", "<concise improvement 2 in Spanish>"]
}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: text }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);

    // Save AI results to DB
    const updated = updateAnalysisWithAI(analysisId, {
      ai_model: model,
      job_description: jobDescription || null,
      ai_score: parsedResult.score,
      ai_feedback: parsedResult.feedback,
      ai_keywords: parsedResult.keywordsFound || [],
      ai_improvements: parsedResult.improvements || [],
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Gemini ATS Error:", error);
    return NextResponse.json(
      { error: "Failed to score CV with ATS" },
      { status: 500 }
    );
  }
}
