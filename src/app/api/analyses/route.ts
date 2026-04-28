import { NextResponse } from "next/server";
import { listAnalyses, deleteAnalysis } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

async function getAuthedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = await listAnalyses(supabase);
    return NextResponse.json(analyses);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = await listAnalyses(supabase);
    for (const a of analyses) {
      await deleteAnalysis(supabase, a.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
