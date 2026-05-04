import { NextRequest, NextResponse } from "next/server";
import {
  getCV,
  getLatestRecommendationAnalysisForCV,
  updateCVProfile,
} from "@/lib/db";
import { editCVProfileWithAI } from "@/lib/ai-cv-editing";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

function parseStringArray(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      geminiApiKey,
      model = "gemini-2.5-flash",
      instruction,
    } = (await req.json()) as {
      geminiApiKey?: string;
      model?: string;
      instruction?: string;
    };

    if (!geminiApiKey?.trim()) {
      return NextResponse.json(
        { error: "Configura tu API key de Gemini antes de editar el CV." },
        { status: 400 }
      );
    }
    if (!instruction?.trim()) {
      return NextResponse.json(
        { error: "Escribe una instrucción para editar el CV." },
        { status: 400 }
      );
    }

    const cv = await getCV(supabase, id, user.id);
    if (!cv || cv.type !== "template") {
      return NextResponse.json({ error: "Template CV not found" }, { status: 404 });
    }
    if (!cv.profile) {
      return NextResponse.json({ error: "CV has no profile" }, { status: 400 });
    }

    const sourceCvId = cv.source_cv_id;
    const latestAnalysis = sourceCvId
      ? await getLatestRecommendationAnalysisForCV(supabase, sourceCvId, user.id)
      : null;
    const recommendations = latestAnalysis
      ? [
          ...parseStringArray(latestAnalysis.ai_improvements),
          ...parseStringArray(latestAnalysis.missing_keywords).map(
            (keyword) => `Consider adding or strengthening this missing keyword if it is truthful: ${keyword}`
          ),
        ]
      : [];

    const editedProfile = await editCVProfileWithAI({
      apiKey: geminiApiKey.trim(),
      model,
      profile: cv.profile,
      instruction: instruction.trim(),
      templateId: (cv.template_id ?? "compact") as "compact",
      locale: (cv.template_locale ?? "es") as "es" | "en",
      recommendations,
    });

    const updated = await updateCVProfile(supabase, id, user.id, {
      ai_model: model,
      profile: editedProfile,
    });

    return NextResponse.json({ version: updated });
  } catch (error: unknown) {
    console.error("CV edit error:", error);
    return NextResponse.json(
      { error: "Failed to edit CV", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
