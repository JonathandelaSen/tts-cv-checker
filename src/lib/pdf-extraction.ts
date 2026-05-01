import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getErrorMessage } from "@/lib/errors";
import {
  getErrorCode,
  getTextLength,
  hasExtractedText,
  recordProcessingEvent,
  sanitizeErrorMessage,
} from "@/lib/observability";

const execFileAsync = promisify(execFile);

export interface ExtractedPdfText {
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
}

export interface PdfExtractionContext {
  userId: string;
  cvId: string;
  requestId: string;
  fileSize?: number | null;
  filename?: string | null;
}

function parseScriptJson(stdout: string): { text?: string; error?: string } {
  const jsonStr = stdout.substring(
    stdout.indexOf("{"),
    stdout.lastIndexOf("}") + 1
  );
  return JSON.parse(jsonStr || "{}") as { text?: string; error?: string };
}

async function recordParserEvent(
  context: PdfExtractionContext | undefined,
  input: {
    source: string;
    status: "started" | "success" | "warning" | "error";
    durationMs?: number | null;
    textLength?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }
) {
  if (!context) return;

  await recordProcessingEvent({
    userId: context.userId,
    cvId: context.cvId,
    requestId: context.requestId,
    stage: "pdf_parser",
    status: input.status,
    source: input.source,
    durationMs: input.durationMs,
    fileSize: context.fileSize,
    textLength: input.textLength,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    metadata: {
      filename: context.filename,
    },
  });
}

export async function extractPdfText(
  buffer: Buffer,
  context?: PdfExtractionContext
): Promise<ExtractedPdfText> {
  const extractionStartedAt = performance.now();
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
      const parserStartedAt = performance.now();
      await recordParserEvent(context, {
        source: "node_pdf_parse",
        status: "started",
      });
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
      await recordParserEvent(context, {
        source: "node_pdf_parse",
        status: extract_error_node ? "error" : getTextLength(text_node) > 0 ? "success" : "warning",
        durationMs: performance.now() - parserStartedAt,
        textLength: getTextLength(text_node),
        errorCode: extract_error_node ? "parser_error" : getTextLength(text_node) > 0 ? null : "empty_text",
        errorMessage: extract_error_node
          ? sanitizeErrorMessage(extract_error_node)
          : null,
      });
    } catch (e: unknown) {
      extract_error_node = getErrorMessage(e);
      await recordParserEvent(context, {
        source: "node_pdf_parse",
        status: "error",
        errorCode: getErrorCode(e),
        errorMessage: sanitizeErrorMessage(e),
      });
    }

    try {
      const parserStartedAt = performance.now();
      await recordParserEvent(context, {
        source: "node_pdfjs",
        status: "started",
      });
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
      await recordParserEvent(context, {
        source: "node_pdfjs",
        status: extract_error_pdfjs ? "error" : getTextLength(text_pdfjs) > 0 ? "success" : "warning",
        durationMs: performance.now() - parserStartedAt,
        textLength: getTextLength(text_pdfjs),
        errorCode: extract_error_pdfjs ? "parser_error" : getTextLength(text_pdfjs) > 0 ? null : "empty_text",
        errorMessage: extract_error_pdfjs
          ? sanitizeErrorMessage(extract_error_pdfjs)
          : null,
      });
    } catch (e: unknown) {
      extract_error_pdfjs = getErrorMessage(e);
      await recordParserEvent(context, {
        source: "node_pdfjs",
        status: "error",
        errorCode: getErrorCode(e),
        errorMessage: sanitizeErrorMessage(e),
      });
    }

    try {
      const parserStartedAt = performance.now();
      await recordParserEvent(context, {
        source: "python_pdfminer",
        status: "started",
      });
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
      await recordParserEvent(context, {
        source: "python_pdfminer",
        status: extract_error_python ? "error" : getTextLength(text_python) > 0 ? "success" : "warning",
        durationMs: performance.now() - parserStartedAt,
        textLength: getTextLength(text_python),
        errorCode: extract_error_python ? "parser_error" : getTextLength(text_python) > 0 ? null : "empty_text",
        errorMessage: extract_error_python
          ? sanitizeErrorMessage(extract_error_python)
          : null,
      });
    } catch (e: unknown) {
      extract_error_python = getErrorMessage(e);
      await recordParserEvent(context, {
        source: "python_pdfminer",
        status: "error",
        errorCode: getErrorCode(e),
        errorMessage: sanitizeErrorMessage(e),
      });
    }
  } finally {
    if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
  }

  if (context) {
    const texts = [text_python, text_pdfjs, text_node];
    await recordProcessingEvent({
      userId: context.userId,
      cvId: context.cvId,
      requestId: context.requestId,
      stage: "pdf_extraction",
      status: hasExtractedText(texts) ? "success" : "warning",
      durationMs: performance.now() - extractionStartedAt,
      fileSize: context.fileSize,
      textLength: Math.max(...texts.map((text) => getTextLength(text))),
      errorCode: hasExtractedText(texts) ? null : "no_extracted_text_available",
      errorMessage: hasExtractedText(texts)
        ? null
        : "No parser produced usable text.",
      metadata: {
        filename: context.filename,
        pythonLength: getTextLength(text_python),
        pdfjsLength: getTextLength(text_pdfjs),
        nodeLength: getTextLength(text_node),
        pythonError: Boolean(extract_error_python),
        pdfjsError: Boolean(extract_error_pdfjs),
        nodeError: Boolean(extract_error_node),
      },
    });
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
