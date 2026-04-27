const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function main() {
  try {
    const file = process.argv[2];
    if (!file) {
      console.log(JSON.stringify({ success: false, error: "No file provided" }));
      return;
    }
    const dataBuffer = new Uint8Array(fs.readFileSync(file));
    
    // Disable workers to avoid issues with standard canvas
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const loadingTask = pdfjsLib.getDocument({ data: dataBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdfDocument.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + "\n";
    }

    console.log(JSON.stringify({ success: true, text: fullText }));
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: error.message }));
  }
}

main();
