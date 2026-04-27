import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

async function main() {
  // Override console to prevent pdfjs from corrupting stdout
  const originalLog = console.log;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  try {
    const file = process.argv[2];
    if (!file) {
      originalLog(JSON.stringify({ success: false, error: "No file provided" }));
      return;
    }

    const workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = fileURLToPath(workerSrc);

    const standardFontDataUrl = fileURLToPath(import.meta.resolve('pdfjs-dist/standard_fonts/')) + path.sep;

    const dataBuffer = new Uint8Array(fs.readFileSync(file));
    
    const loadingTask = pdfjsLib.getDocument({ 
      data: dataBuffer,
      standardFontDataUrl
    });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdfDocument.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + "\n";
    }

    originalLog(JSON.stringify({ success: true, text: fullText.trim() }));
  } catch (error) {
    originalLog(JSON.stringify({ success: false, error: error.message }));
  }
}

main();
