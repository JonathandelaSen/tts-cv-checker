import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfigSource = readFileSync(
  new URL("../next.config.ts", import.meta.url),
  "utf8"
);

test("Next.js traces child-process PDF parser dependencies into serverless bundles", () => {
  assert.match(nextConfigSource, /node_modules\/pdf-parse\/\*\*\//);
  assert.match(nextConfigSource, /node_modules\/pdfjs-dist\/\*\*\//);
});
