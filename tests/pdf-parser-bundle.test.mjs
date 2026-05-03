import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfigSource = readFileSync(
  new URL("../next.config.ts", import.meta.url),
  "utf8"
);

test("Next.js traces in-process PDF parser dependencies into serverless bundles", () => {
  assert.match(nextConfigSource, /serverExternalPackages/);
  assert.match(nextConfigSource, /@napi-rs\/canvas/);
  assert.match(nextConfigSource, /node_modules\/pdf-parse\/\*\*\//);
  assert.match(nextConfigSource, /node_modules\/pdfjs-dist\/\*\*\//);
  assert.doesNotMatch(nextConfigSource, /\.\/scripts\/\*\*\//);
});
