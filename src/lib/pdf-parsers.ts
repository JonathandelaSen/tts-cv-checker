import { createRequire } from "module";

const nodeRequire = createRequire(import.meta.url);

type PdfParse = (dataBuffer: Buffer) => Promise<{ text?: string | null }>;

type PdfJsLib = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfParseModule: PdfParse | null = null;
let pdfjsModule: PdfJsLib | null = null;
let canvasPolyfillsReady = false;

function cleanExtractedText(text: string | null | undefined) {
  const cleaned = text?.trim();
  return cleaned ? cleaned : null;
}

async function loadPdfParse() {
  if (!pdfParseModule) {
    pdfParseModule = nodeRequire("pdf-parse") as PdfParse;
  }

  return pdfParseModule;
}

async function ensurePdfjsCanvasPolyfills() {
  if (canvasPolyfillsReady) return;

  const canvas = await import("@napi-rs/canvas");

  globalThis.DOMMatrix ??= canvas.DOMMatrix as typeof DOMMatrix;
  globalThis.ImageData ??= canvas.ImageData as unknown as typeof ImageData;
  globalThis.Path2D ??= canvas.Path2D as typeof Path2D;
  canvasPolyfillsReady = true;
}

async function loadPdfjs() {
  if (!pdfjsModule) {
    await ensurePdfjsCanvasPolyfills();
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsModule;
}

export async function extractWithPdfParse(
  buffer: Buffer
): Promise<{ text: string | null }> {
  const pdfParse = await loadPdfParse();
  const parsed = await pdfParse(buffer);
  return { text: cleanExtractedText(parsed.text) };
}

export async function extractWithPdfjs(
  buffer: Buffer
): Promise<{ text: string | null }> {
  const pdfjsLib = await loadPdfjs();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });
  const pdfDocument = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pageTexts.push(pageText);
  }

  return { text: cleanExtractedText(pageTexts.join("\n")) };
}
