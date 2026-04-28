import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, deleteAnalysis } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

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
    const analysis = await getAnalysis(supabase, id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "Failed to get analysis", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const deleted = await deleteAnalysis(supabase, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete analysis error:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
