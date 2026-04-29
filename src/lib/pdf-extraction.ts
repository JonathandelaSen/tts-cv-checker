import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getErrorMessage } from "@/lib/errors";

const execFileAsync = promisify(execFile);

export interface ExtractedPdfText {
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
}

function parseScriptJson(stdout: string): { text?: string; error?: string } {
  const jsonStr = stdout.substring(
    stdout.indexOf("{"),
    stdout.lastIndexOf("}") + 1
  );
  return JSON.parse(jsonStr || "{}") as { text?: string; error?: string };
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdfText> {
  let tempFilePath: string | null = null;

  let text_node: string | null = null;
  let extract_error_node: string | null = null;
  let text_pdfjs: string | null = null;
  let extract_error_pdfjs: string | null = null;
  let text_python: string | null = null;
  let extract_error_python: string | null = null;

  try {
    tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, buffer);

    try {
      const nodeScriptPath = [process.cwd(), "scripts", "node_parser.js"].join(
        path.sep
      );
      const { stdout } = await execFileAsync("node", [
        nodeScriptPath,
        tempFilePath,
      ]);
      const parsedOut = parseScriptJson(stdout);
      text_node = parsedOut.text || null;
      extract_error_node = parsedOut.error || null;
    } catch (e: unknown) {
      extract_error_node = getErrorMessage(e);
    }

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
      const parsedOut = parseScriptJson(stdout);
      text_pdfjs = parsedOut.text || null;
      extract_error_pdfjs = parsedOut.error || null;
    } catch (e: unknown) {
      extract_error_pdfjs = getErrorMessage(e);
    }

    try {
      const pythonPath = [process.cwd(), "venv", "bin", "python"].join(
        path.sep
      );
      const scriptPath = [process.cwd(), "scripts", "parser.py"].join(path.sep);
      const { stdout } = await execFileAsync(pythonPath, [
        scriptPath,
        tempFilePath,
      ]);
      const parsedOut = parseScriptJson(stdout);
      text_python = parsedOut.text || null;
      extract_error_python = parsedOut.error || null;
    } catch (e: unknown) {
      extract_error_python = getErrorMessage(e);
    }
  } finally {
    if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
  }

  return {
    text_python,
    text_pdfjs,
    text_node,
    extract_error_python,
    extract_error_pdfjs,
    extract_error_node,
  };
}
