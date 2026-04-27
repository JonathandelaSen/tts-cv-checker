import { NextRequest, NextResponse } from "next/server";
import { getAnalysis } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = getAnalysis(id);

    if (!analysis || !analysis.pdf_path) {
      return NextResponse.json(
        { error: "PDF no encontrado" },
        { status: 404 }
      );
    }

    const stat = fs.statSync(analysis.pdf_path);
    const stream = fs.createReadStream(analysis.pdf_path);

    // Convert Node Readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(analysis.filename)}"`,
      },
    });
  } catch (error: any) {
    console.error("Download PDF error:", error);
    return NextResponse.json(
      { error: "Error descargando el PDF" },
      { status: 500 }
    );
  }
}
