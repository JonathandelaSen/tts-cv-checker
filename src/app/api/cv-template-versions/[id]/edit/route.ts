import { NextRequest, NextResponse } from "next/server";
import {
  getCVTemplateVersion,
  getLatestRecommendationAnalysisForCV,
  updateCVTemplateVersion,
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
      model = "gemini-3.1-pro-preview",
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

    const version = await getCVTemplateVersion(supabase, id, user.id);
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const latestAnalysis = await getLatestRecommendationAnalysisForCV(
      supabase,
      version.source_cv_id,
      user.id
    );
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
      profile: version.profile,
      instruction: instruction.trim(),
      templateId: version.template_id,
      locale: version.template_locale,
      recommendations,
    });

    const updated = await updateCVTemplateVersion(supabase, id, user.id, {
      ai_model: model,
      profile: editedProfile,
    });

    return NextResponse.json({ version: updated });
  } catch (error: unknown) {
    console.error("Template version edit error:", error);
    return NextResponse.json(
      { error: "Failed to edit CV version", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
