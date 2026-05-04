import { NextResponse } from "next/server";
import { getCVTemplateVersion } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { getCVTemplate, type CVTemplateId } from "@/lib/cv-templates";
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
    const version = await getCVTemplateVersion(supabase, id, user.id);
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const template = getCVTemplate(version.template_id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const pdf = await renderTemplatePDF({
      profile: version.profile,
      templateId: template.templateId as CVTemplateId,
      locale: version.template_locale,
    });

    const filename = `${version.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Template version PDF error:", error);
    return NextResponse.json(
      { error: "Error exporting template PDF", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
