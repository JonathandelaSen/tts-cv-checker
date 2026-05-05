import { NextRequest, NextResponse } from "next/server";
import { CV_PDFS_BUCKET, getCV } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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
    const cv = await getCV(supabase, id, user.id);

    if (cv?.type === "template") {
      const targetUrl = new URL(`/api/cvs/${id}/template-pdf`, req.url);
      if (req.nextUrl.searchParams.has("download")) {
        targetUrl.searchParams.set("download", "1");
      }
      return NextResponse.redirect(targetUrl);
    }

    if (!cv?.pdf_storage_path) {
      return NextResponse.json(
        { error: "PDF no encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .download(cv.pdf_storage_path);

    if (error || !data) {
      return NextResponse.json(
        { error: "PDF no encontrado" },
        { status: 404 }
      );
    }

    const disposition = req.nextUrl.searchParams.get("download")
      ? "attachment"
      : "inline";

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(cv.filename ?? "cv.pdf")}"`,
      },
    });
  } catch (error: unknown) {
    console.error("CV PDF error:", error);
    return NextResponse.json(
      { error: "Error cargando el PDF", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
