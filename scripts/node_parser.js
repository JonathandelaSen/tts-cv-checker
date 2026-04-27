const pdfParse = require('pdf-parse');
const fs = require('fs');

async function main() {
  // Override console to prevent pdf-parse from corrupting stdout
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
    const dataBuffer = fs.readFileSync(file);
    const data = await pdfParse(dataBuffer);
    originalLog(JSON.stringify({ success: true, text: data.text }));
  } catch (error) {
    originalLog(JSON.stringify({ success: false, error: error.message }));
  }
}

main();
