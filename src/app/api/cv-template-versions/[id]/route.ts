import { NextRequest, NextResponse } from "next/server";
import { getCVTemplateVersion, updateCVTemplateVersion } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { CVTemplateLocale } from "@/lib/cv-templates";

export async function GET(
  _req: NextRequest,
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
    return NextResponse.json(version);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
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
    const { template_locale } = (await req.json()) as {
      template_locale?: CVTemplateLocale;
    };
    if (template_locale !== "es" && template_locale !== "en") {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }
    const version = await updateCVTemplateVersion(supabase, id, user.id, {
      template_locale,
    });
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    return NextResponse.json({ version });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
