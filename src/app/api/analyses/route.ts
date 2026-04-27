import { NextResponse } from "next/server";
import { listAnalyses } from "@/lib/db";

export async function GET() {
  try {
    const analyses = listAnalyses();
    return NextResponse.json(analyses);
  } catch (error: any) {
    console.error("List analyses error:", error);
    return NextResponse.json(
      { error: "Failed to list analyses" },
      { status: 500 }
    );
  }
}
