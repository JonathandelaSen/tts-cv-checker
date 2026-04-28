import { NextResponse } from "next/server";
import { listAnalyses, deleteAnalysis, getAnalysis } from "@/lib/db";
import fs from "fs";

export async function GET() {
  try {
    const analyses = listAnalyses();
    return NextResponse.json(analyses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const analyses = listAnalyses();
    for (const a of analyses) {
      // We need to fetch the full analysis to get the pdf_path
      const full = getAnalysis(a.id);
      if (full?.pdf_path) {
        try {
          fs.unlinkSync(full.pdf_path);
        } catch {
          // ignore
        }
      }
      deleteAnalysis(a.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
