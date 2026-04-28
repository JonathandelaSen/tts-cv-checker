import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { CV_PDFS_BUCKET, createAnalysis } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create temp file for scripts
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, buffer);

    // 1. Node.js Parsing (pdf-parse via isolated script)
    let nodeText: string | null = null;
    let nodeError: string | null = null;
    try {
      const nodeScriptPath = [process.cwd(), "scripts", "node_parser.js"].join(
        path.sep
      );
      const { stdout } = await execFileAsync("node", [
        nodeScriptPath,
        tempFilePath,
      ]);
      const jsonStr = stdout.substring(
        stdout.indexOf("{"),
        stdout.lastIndexOf("}") + 1
      );
      const parsedOut = JSON.parse(jsonStr || "{}");
      nodeText = parsedOut.text || null;
      if (parsedOut.error) nodeError = parsedOut.error;
    } catch (e: unknown) {
      nodeError = getErrorMessage(e);
    }

    // 2. Node.js Parsing (pdfjs-dist)
    let pdfjsText: string | null = null;
    let pdfjsError: string | null = null;
    try {
      const nodePdfjsScriptPath = [
        process.cwd(),
        "scripts",
        "node_pdfjs_parser.mjs",
      ].join(path.sep);
      const { stdout } = await execFileAsync("node", [
        nodePdfjsScriptPath,
        tempFilePath,
      ]);
      const jsonStr = stdout.substring(
        stdout.indexOf("{"),
        stdout.lastIndexOf("}") + 1
      );
      const parsedOut = JSON.parse(jsonStr || "{}");
      pdfjsText = parsedOut.text || null;
      if (parsedOut.error) pdfjsError = parsedOut.error;
    } catch (e: unknown) {
      pdfjsError = getErrorMessage(e);
    }

    // 3. Python Parsing (pdfminer.six)
    let pythonText: string | null = null;
    let pythonError: string | null = null;
    try {
      const pythonPath = [process.cwd(), "venv", "bin", "python"].join(
        path.sep
      );
      const scriptPath = [process.cwd(), "scripts", "parser.py"].join(path.sep);
      const { stdout } = await execFileAsync(pythonPath, [
        scriptPath,
        tempFilePath,
      ]);
      const jsonStr = stdout.substring(
        stdout.indexOf("{"),
        stdout.lastIndexOf("}") + 1
      );
      const parsedOut = JSON.parse(jsonStr || "{}");
      pythonText = parsedOut.text || null;
      pythonError = parsedOut.error || null;
    } catch (e: unknown) {
      pythonError = getErrorMessage(e);
    }

    const analysisId = crypto.randomUUID();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pdfStoragePath = `${user.id}/${analysisId}-${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from(CV_PDFS_BUCKET)
      .upload(pdfStoragePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {});
    tempFilePath = null;

    // Save to database
    const analysis = await createAnalysis(supabase, {
      id: analysisId,
      user_id: user.id,
      filename: file.name,
      file_size: file.size,
      pdf_storage_path: pdfStoragePath,
      text_python: pythonText,
      text_pdfjs: pdfjsText,
      text_node: nodeText,
      extract_error_python: pythonError,
      extract_error_pdfjs: pdfjsError,
      extract_error_node: nodeError,
    });

    return NextResponse.json({
      id: analysis.id,
      filename: analysis.filename,
      created_at: analysis.created_at,
      texts: {
        python: pythonText,
        pdfjs: pdfjsText,
        node: nodeText,
      },
      errors: {
        python: pythonError,
        pdfjs: pdfjsError,
        node: nodeError,
      },
    });
  } catch (error: unknown) {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
