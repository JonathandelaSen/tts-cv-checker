import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, deleteAnalysis } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = getAnalysis(id);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "Failed to get analysis" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteAnalysis(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete analysis error:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
