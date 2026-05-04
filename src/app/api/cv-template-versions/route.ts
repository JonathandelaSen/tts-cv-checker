import { NextResponse } from "next/server";
import { listCVTemplateVersions } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const versions = await listCVTemplateVersions(supabase, user.id);
    return NextResponse.json(versions);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
