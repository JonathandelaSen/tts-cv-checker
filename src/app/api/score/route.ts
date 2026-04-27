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

    const systemPrompt = `Eres un estricto ATS (Applicant Tracking System). Tu trabajo es analizar el texto extraído de un currículum PDF y evaluarlo.
${jobDescription ? `\nEl usuario proporcionó la siguiente descripción de la oferta de trabajo:\n${jobDescription}\nCompara el CV con esta oferta de manera estricta.` : `No se ha proporcionado una descripción de oferta. Haz una evaluación general de la estructura, legibilidad para ATS y claridad de las habilidades.`}

Debes responder ÚNICAMENTE con un JSON válido usando el siguiente formato exacto:
{
  "score": <número de 0 a 100>,
  "feedback": "<Resumen conciso y directo de qué tal se extrajo el texto (ej. si hay caracteres raros) y cómo se ajusta a lo que busca un ATS>",
  "keywordsFound": ["<palabra clave 1>", "<palabra clave 2>"],
  "improvements": ["<mejora concisa 1>", "<mejora concisa 2>"]
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
