import { NextRequest, NextResponse } from "next/server";
import {
  getCV,
  getCVStructuredProfile,
  getLatestRecommendationAnalysisForCV,
  upsertCVStructuredProfile,
} from "@/lib/db";
import { editCVProfileWithAI } from "@/lib/ai-cv-editing";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  getCVTemplate,
  type CVTemplateId,
  type CVTemplateLocale,
} from "@/lib/cv-templates";

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
      templateId,
      locale,
    } = (await req.json()) as {
      geminiApiKey?: string;
      model?: string;
      instruction?: string;
      templateId?: string;
      locale?: string;
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
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const structured = await getCVStructuredProfile(supabase, id, user.id);
    if (!structured) {
      return NextResponse.json(
        { error: "Structured profile not found" },
        { status: 404 }
      );
    }

    const template = getCVTemplate(templateId ?? cv.template_id ?? "");
    if (!template) {
      return NextResponse.json(
        { error: "Selecciona una plantilla antes de editar el CV." },
        { status: 400 }
      );
    }
    const requestedLocale = locale ?? cv.template_locale ?? "es";
    const selectedTemplateId = template.templateId satisfies CVTemplateId;
    const selectedLocale = template.locales.includes(
      requestedLocale as CVTemplateLocale
    )
      ? (requestedLocale as CVTemplateLocale)
      : "es";
    const latestAnalysis = await getLatestRecommendationAnalysisForCV(
      supabase,
      id,
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
      profile: structured.profile,
      instruction: instruction.trim(),
      templateId: selectedTemplateId,
      locale: selectedLocale,
      recommendations,
    });

    const profile = await upsertCVStructuredProfile(supabase, {
      user_id: user.id,
      cv_id: id,
      schema_version: structured.schema_version,
      source_text_hash: structured.source_text_hash,
      ai_model: model,
      profile: editedProfile,
    });

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error("Structured profile edit error:", error);
    return NextResponse.json(
      {
        error: "Failed to edit CV profile",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
