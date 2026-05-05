import { NextRequest, NextResponse } from "next/server";
import {
  getCV,
  getCVStructuredProfile,
  upsertCVStructuredProfile,
} from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { structureCVProfileWithAI } from "@/lib/ai-cv-structuring";
import { getBestCVText, getCVSourceTextHash } from "@/lib/cv-profile";
import { createClient } from "@/lib/supabase/server";

async function getAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cv = await getCV(supabase, id, user.id);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const profile = await getCVStructuredProfile(supabase, id, user.id);
    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      geminiApiKey,
      model = "gemini-3.1-pro-preview",
      force = false,
    } = (await req.json()) as {
      geminiApiKey?: string;
      model?: string;
      force?: boolean;
    };

    if (!geminiApiKey?.trim()) {
      return NextResponse.json(
        {
          error:
            "Configura tu API key de Gemini en Configuración antes de estructurar el CV.",
        },
        { status: 400 }
      );
    }

    const cv = await getCV(supabase, id, user.id);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const text = getBestCVText(cv);
    if (!text) {
      return NextResponse.json(
        { error: "No extracted text available for this CV" },
        { status: 400 }
      );
    }

    const sourceTextHash = getCVSourceTextHash(text);
    const existing = await getCVStructuredProfile(supabase, id, user.id);
    if (existing && existing.source_text_hash === sourceTextHash && !force) {
      return NextResponse.json({ profile: existing, cached: true });
    }

    const structured = await structureCVProfileWithAI({
      apiKey: geminiApiKey.trim(),
      model,
      text,
    });

    const profile = await upsertCVStructuredProfile(supabase, {
      user_id: user.id,
      cv_id: id,
      schema_version: structured.schemaVersion,
      source_text_hash: sourceTextHash,
      ai_model: model,
      profile: structured.profile,
    });

    return NextResponse.json({ profile, cached: false });
  } catch (error: unknown) {
    console.error("Structured profile error:", error);
    return NextResponse.json(
      {
        error: "Failed to structure CV profile",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
