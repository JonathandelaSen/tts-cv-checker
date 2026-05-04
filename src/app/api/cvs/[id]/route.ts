import { NextRequest, NextResponse } from "next/server";
import { deleteCV, getCV, updateCVName, updateCVProfile } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
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

    return NextResponse.json(cv);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as {
      name?: string;
      profile?: Record<string, unknown>;
      template_locale?: string;
    };

    if (body.profile || body.template_locale) {
      const updated = await updateCVProfile(supabase, id, user.id, {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.profile ? { profile: body.profile as never } : {}),
        ...(body.template_locale ? { template_locale: body.template_locale } : {}),
      });
      if (!updated) {
        return NextResponse.json({ error: "Template CV not found" }, { status: 404 });
      }
      return NextResponse.json(updated);
    }

    const trimmedName = body.name?.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const cv = await updateCVName(supabase, id, user.id, trimmedName);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    return NextResponse.json(cv);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await deleteCV(supabase, id, user.id);
    if (result.status === "not_found") {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }
    if (result.status === "in_use") {
      return NextResponse.json(
        {
          error: "No puedes borrar un CV con análisis asociados.",
          analyses: result.analyses,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
