import { NextRequest, NextResponse } from "next/server";
import { getCV, getLatestRecommendationAnalysisForCV } from "@/lib/db";
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
    const cv = await getCV(supabase, id, user.id);
    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    const analysis = await getLatestRecommendationAnalysisForCV(
      supabase,
      id,
      user.id
    );
    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
