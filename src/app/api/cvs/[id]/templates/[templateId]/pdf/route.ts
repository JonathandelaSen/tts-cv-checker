import { NextRequest, NextResponse } from "next/server";
import { getCV, getCVStructuredProfile } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import {
  getCVTemplate,
  type CVTemplateId,
  type CVTemplateLocale,
} from "@/lib/cv-templates";
import { renderTemplatePDF } from "@/lib/cv-template-pdf";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, templateId } = await params;
    const template = getCVTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
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

    const requestedLocale = req.nextUrl.searchParams.get("locale") ?? "es";
    const locale = template.locales.includes(requestedLocale as CVTemplateLocale)
      ? (requestedLocale as CVTemplateLocale)
      : "es";

    const pdf = await renderTemplatePDF({
      profile: structured.profile,
      templateId: template.templateId as CVTemplateId,
      locale,
    });

    const filename = `${cv.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${template.templateId}.pdf`;

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
