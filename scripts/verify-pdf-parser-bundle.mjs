import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tracedRoutes = [
  ".next/server/app/api/parse/route.js.nft.json",
  ".next/server/app/api/cvs/route.js.nft.json",
  ".next/server/app/api/analyses/route.js.nft.json",
];

for (const routeTracePath of tracedRoutes) {
  const trace = JSON.parse(readFileSync(routeTracePath, "utf8"));
  const files = trace.files || [];

  assert.ok(
    files.some((file) => file.includes("node_modules/pdf-parse/index.js")),
    `${routeTracePath} must trace pdf-parse for scripts/node_parser.js`
  );

  assert.ok(
    files.some((file) =>
      file.includes("node_modules/pdfjs-dist/legacy/build/pdf.mjs")
    ),
    `${routeTracePath} must trace pdfjs-dist for scripts/node_pdfjs_parser.mjs`
  );

  assert.ok(
    files.some((file) =>
      file.includes("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
    ),
    `${routeTracePath} must trace the pdfjs worker`
  );

  assert.ok(
    files.some((file) =>
      file.includes("node_modules/pdfjs-dist/standard_fonts/")
    ),
    `${routeTracePath} must trace pdfjs standard fonts`
  );
}

console.log("PDF parser bundle traces include node parser dependencies.");
