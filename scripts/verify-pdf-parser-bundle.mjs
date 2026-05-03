import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const cwd = process.cwd();

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
    `${routeTracePath} must trace pdf-parse for the in-process parser`
  );

  assert.ok(
    files.some((file) => file.includes("node_modules/@napi-rs/canvas")),
    `${routeTracePath} must trace @napi-rs/canvas for pdfjs DOM polyfills`
  );

  assert.ok(
    files.some((file) =>
      file.includes("node_modules/pdfjs-dist/legacy/build/pdf.mjs")
    ),
    `${routeTracePath} must trace pdfjs-dist for the in-process parser`
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

const routeBundle = readFileSync(".next/server/app/api/parse/route.js", "utf8");
const routeChunks = [
  ...routeBundle.matchAll(/R\.c\("([^"]+)"\)/g),
].map((match) => match[1]);

for (const chunkPath of routeChunks) {
  const chunkSource = readFileSync(`.next/${chunkPath}`, "utf8");
  assert.doesNotMatch(
    chunkSource,
    /eval\(["']require["']\)|require is not defined/,
    `${chunkPath} must not depend on runtime require for pdfjs asset resolution`
  );
  assert.doesNotMatch(
    chunkSource,
    /Cannot find module as expression is too dynamic[\s\S]{0,400}pdfjs-dist|pdfjs-dist[\s\S]{0,400}Cannot find module as expression is too dynamic/,
    `${chunkPath} must not replace pdfjs asset resolution with a dynamic-module stub`
  );
}

const runtime = require(path.join(
  cwd,
  ".next/server/chunks/[turbopack]_runtime.js"
))("server/app/api/parse/route.js");
for (const chunkPath of routeChunks) {
  runtime.c(chunkPath);
}

const { extractPdfText } = runtime.m(41071).exports;
const result = await extractPdfText(readFileSync("test.pdf"));

assert.equal(result.extract_error_pdfjs, null);
assert.ok(
  (result.text_pdfjs?.length ?? 0) > 0,
  "production pdfjs extraction smoke test must extract text"
);

console.log("PDF parser bundle traces include in-process parser dependencies.");
