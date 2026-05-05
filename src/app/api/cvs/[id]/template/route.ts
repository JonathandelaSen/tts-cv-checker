import { NextRequest, NextResponse } from "next/server";
import {
  createTemplateCV,
  getCV,
  getCVStructuredProfile,
  upsertCVStructuredProfile,
} from "@/lib/db";
import { structureCVProfileWithAI } from "@/lib/ai-cv-structuring";
import { getBestCVText, getCVSourceTextHash } from "@/lib/cv-profile";
import { getErrorMessage } from "@/lib/errors";
import {
  getCVTemplate,
  type CVTemplateLocale,
} from "@/lib/cv-templates";
import { createClient } from "@/lib/supabase/server";

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
      templateId,
      locale = "es",
      geminiApiKey,
      model = "gemini-3.1-pro-preview",
    } = (await req.json()) as {
      templateId?: string;
      locale?: string;
      geminiApiKey?: string;
      model?: string;
    };

    const template = templateId ? getCVTemplate(templateId) : null;
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const selectedLocale = template.locales.includes(locale as CVTemplateLocale)
      ? (locale as CVTemplateLocale)
      : "es";

    const cv = await getCV(supabase, id, user.id);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    let profile = await getCVStructuredProfile(supabase, id, user.id);
    if (!profile) {
      if (!geminiApiKey?.trim()) {
        return NextResponse.json(
          {
            error:
              "Configura tu API key de Gemini antes de preparar este CV para plantillas.",
          },
          { status: 400 }
        );
      }

      const text = getBestCVText(cv);
      if (!text) {
        return NextResponse.json(
          { error: "No extracted text available for this CV" },
          { status: 400 }
        );
      }

      const structured = await structureCVProfileWithAI({
        apiKey: geminiApiKey.trim(),
        model,
        text,
      });
      profile = await upsertCVStructuredProfile(supabase, {
        user_id: user.id,
        cv_id: id,
        schema_version: structured.schemaVersion,
        source_text_hash: getCVSourceTextHash(text),
        ai_model: model,
        profile: structured.profile,
      });
    }

    const templateCV = await createTemplateCV(supabase, {
      user_id: user.id,
      source_cv_id: id,
      name: `${cv.name} · ${template.name}`,
      template_id: template.templateId,
      template_locale: selectedLocale,
      schema_version: profile.schema_version,
      source_text_hash: profile.source_text_hash,
      ai_model: profile.ai_model,
      profile: profile.profile,
    });

    return NextResponse.json({ version: templateCV, profile });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Template selection error:", message, error);
    return NextResponse.json(
      {
        error: message || "Failed to select CV template",
        details: message,
      },
      { status: 500 }
    );
  }
}
