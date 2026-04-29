import { NextRequest, NextResponse } from "next/server";
import { CV_PDFS_BUCKET, createCV, listCVs } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { extractPdfText } from "@/lib/pdf-extraction";
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

    const cvs = await listCVs(supabase);
    return NextResponse.json(cvs);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthedSupabase();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedName = String(formData.get("name") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Solo se permiten archivos PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extracted = await extractPdfText(buffer);

    const cvId = crypto.randomUUID();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pdfStoragePath = `${user.id}/${cvId}-${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .upload(pdfStoragePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const cv = await createCV(supabase, {
      id: cvId,
      user_id: user.id,
      name: requestedName || file.name.replace(/\.pdf$/i, ""),
      filename: file.name,
      file_size: file.size,
      pdf_storage_path: pdfStoragePath,
      ...extracted,
    });

    return NextResponse.json(cv);
  } catch (error: unknown) {
    console.error("Create CV error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
