import { NextRequest, NextResponse } from "next/server";
import {
  isAdminUser,
  listProcessingEvents,
  sanitizeErrorMessage,
} from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isAdminUser(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    const events = await listProcessingEvents({
      status: searchParams.get("status"),
      stage: searchParams.get("stage"),
      cvId: searchParams.get("cvId"),
      analysisId: searchParams.get("analysisId"),
      requestId: searchParams.get("requestId"),
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error("Admin processing events error:", error);
    return NextResponse.json(
      { error: "Failed to load processing events", details: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
