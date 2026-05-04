import { NextRequest, NextResponse } from "next/server";
import { convertVersionToCV } from "@/lib/db";
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

    const cv = await convertVersionToCV(supabase, id, user.id, name.trim());

    return NextResponse.json({ cv });
  } catch (error: unknown) {
    console.error("Save version to CV error:", error);
    return NextResponse.json(
      { error: "Failed to save version as CV", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
