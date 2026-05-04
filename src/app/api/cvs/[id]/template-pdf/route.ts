import { NextResponse } from "next/server";
import { getCV } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { getCVTemplate, type CVTemplateId, type CVTemplateLocale } from "@/lib/cv-templates";
import { renderTemplatePDF } from "@/lib/cv-template-pdf";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
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
    const cv = await getCV(supabase, id, user.id);
    if (!cv || cv.type !== "template") {
      return NextResponse.json({ error: "Template CV not found" }, { status: 404 });
    }
    if (!cv.profile || !cv.template_id) {
      return NextResponse.json({ error: "CV has no profile or template" }, { status: 400 });
    }

    const template = getCVTemplate(cv.template_id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const pdf = await renderTemplatePDF({
      profile: cv.profile,
      templateId: template.templateId as CVTemplateId,
      locale: (cv.template_locale ?? "es") as CVTemplateLocale,
    });

    const filename = `${cv.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Template PDF error:", error);
    return NextResponse.json(
      { error: "Error exporting template PDF", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
