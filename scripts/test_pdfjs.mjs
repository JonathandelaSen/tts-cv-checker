import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = fileURLToPath(workerSrc);

const standardFontDataUrl = fileURLToPath(import.meta.resolve('pdfjs-dist/standard_fonts/')) + path.sep;

async function main() {
  const dataBuffer = new Uint8Array(fs.readFileSync('test.pdf'));
  const loadingTask = pdfjsLib.getDocument({ 
    data: dataBuffer,
    standardFontDataUrl
  });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const textContent = await page.getTextContent();
  console.log(textContent.items.map(i => i.str).join(' '));
}
main().catch(console.error);
