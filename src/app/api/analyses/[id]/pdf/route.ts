import { NextRequest, NextResponse } from "next/server";
import { CV_PDFS_BUCKET, getAnalysis } from "@/lib/db";
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

    if (!analysis || !analysis.pdf_storage_path) {
      return NextResponse.json(
        { error: "PDF no encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .download(analysis.pdf_storage_path);

    if (error || !data) {
      return NextResponse.json(
        { error: "PDF no encontrado" },
        { status: 404 }
      );
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(analysis.filename)}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Download PDF error:", error);
    return NextResponse.json(
      { error: "Error descargando el PDF", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
