import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationSource = readFileSync(
  new URL(
    "../supabase/migrations/20260501163858_add_internal_observability.sql",
    import.meta.url
  ),
  "utf8"
);

const observabilitySource = readFileSync(
  new URL("../src/lib/observability.ts", import.meta.url),
  "utf8"
);

const pdfExtractionSource = readFileSync(
  new URL("../src/lib/pdf-extraction.ts", import.meta.url),
  "utf8"
);

const analysesRouteSource = readFileSync(
  new URL("../src/app/api/analyses/route.ts", import.meta.url),
  "utf8"
);

const scoreRouteSource = readFileSync(
  new URL("../src/app/api/score/route.ts", import.meta.url),
  "utf8"
);

test("observability migration creates admin and processing event tables with RLS", () => {
  assert.match(migrationSource, /create table public\.admin_users/);
  assert.match(migrationSource, /create table public\.processing_events/);
  assert.match(migrationSource, /alter table public\.admin_users enable row level security/);
  assert.match(
    migrationSource,
    /alter table public\.processing_events enable row level security/
  );
  assert.match(migrationSource, /Admins can read processing events/);
  assert.match(migrationSource, /processing_events_request_idx/);
});

test("processing event writes are best effort and sanitized", () => {
  assert.match(observabilitySource, /export async function recordProcessingEvent/);
  assert.match(observabilitySource, /catch \(error: unknown\)/);
  assert.match(observabilitySource, /redacted-api-key/);
  assert.match(observabilitySource, /api\.\?key\|authorization\|prompt/);
});

test("PDF extraction emits per-parser events and no-text aggregate signal", () => {
  assert.match(pdfExtractionSource, /stage: "pdf_parser"/);
  assert.match(pdfExtractionSource, /source: "python_pdfminer"/);
  assert.match(pdfExtractionSource, /source: "node_pdfjs"/);
  assert.match(pdfExtractionSource, /source: "node_pdf_parse"/);
  assert.match(pdfExtractionSource, /no_extracted_text_available/);
});

test("analysis routes record no-text preflight events before returning 400", () => {
  for (const source of [analysesRouteSource, scoreRouteSource]) {
    const errorIndex = source.indexOf("No extracted text available");
    const eventIndex = source.indexOf("no_extracted_text_available");

    assert.notEqual(errorIndex, -1);
    assert.notEqual(eventIndex, -1);
    assert.ok(
      eventIndex < errorIndex,
      "no-text observability event should be recorded before returning the user error"
    );
  }
});
