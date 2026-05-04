import { NextRequest, NextResponse } from "next/server";
import { getCV, createCV, upsertCVStructuredProfile } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
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
    const { name } = (await req.json()) as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Proporciona un nombre para el nuevo CV." },
        { status: 400 }
      );
    }

    const templateCV = await getCV(supabase, id, user.id);
    if (!templateCV || templateCV.type !== "template" || !templateCV.profile) {
      return NextResponse.json({ error: "Template CV not found" }, { status: 404 });
    }

    const summaryText = templateCV.profile.summary || "";
    const expText = (templateCV.profile.experience || []).map(e => `${e.company} ${e.role}`).join(" ");

    const newCV = await createCV(supabase, {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: name.trim(),
      filename: `version-${templateCV.template_id}.json`,
      file_size: null,
      pdf_storage_path: null,
      text_python: null,
      text_pdfjs: null,
      text_node: `${summaryText} ${expText}`,
      extract_error_python: null,
      extract_error_pdfjs: null,
      extract_error_node: null,
    });

    await upsertCVStructuredProfile(supabase, {
      user_id: user.id,
      cv_id: newCV.id,
      source_text_hash: templateCV.source_text_hash ?? "",
      ai_model: templateCV.ai_model ?? "",
      profile: templateCV.profile,
    });

    return NextResponse.json({ cv: newCV });
  } catch (error: unknown) {
    console.error("Save template as CV error:", error);
    return NextResponse.json(
      { error: "Failed to save as CV", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
