import { NextResponse } from "next/server";
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
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const template = cv.active_template_id
      ? getCVTemplate(cv.active_template_id)
      : null;
    if (!template) {
      return NextResponse.json(
        { error: "Active template not found" },
        { status: 404 }
      );
    }

    const structured = await getCVStructuredProfile(supabase, id, user.id);
    if (!structured) {
      return NextResponse.json(
        { error: "Structured profile not found" },
        { status: 404 }
      );
    }

    const requestedLocale = cv.template_locale ?? "es";
    const locale = template.locales.includes(requestedLocale)
      ? requestedLocale
      : ("es" satisfies CVTemplateLocale);
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
    console.error("Active template PDF error:", error);
    return NextResponse.json(
      { error: "Error exporting template PDF", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
