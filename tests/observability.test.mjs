import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const migrationSource = readFileSync(
  new URL(
    "../supabase/migrations/20260501163858_add_internal_observability.sql",
    import.meta.url
  ),
  "utf8"
);

const allMigrationSources = readdirSync(
  new URL("../supabase/migrations", import.meta.url)
)
  .filter((filename) => filename.endsWith(".sql"))
  .sort()
  .map((filename) =>
    readFileSync(
      new URL(`../supabase/migrations/${filename}`, import.meta.url),
      "utf8"
    )
  )
  .join("\n");

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

const aiScoringSource = readFileSync(
  new URL("../src/lib/ai-scoring.ts", import.meta.url),
  "utf8"
);

const newAnalysisFlowSource = readFileSync(
  new URL("../src/components/new-analysis-flow.tsx", import.meta.url),
  "utf8"
);

const adminObservabilitySource = readFileSync(
  new URL("../src/components/admin-observability-dashboard.tsx", import.meta.url),
  "utf8"
);

const appShellSource = readFileSync(
  new URL("../src/components/app-shell.tsx", import.meta.url),
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
  assert.match(observabilitySource, /error_code/);
  assert.match(observabilitySource, /error_details/);
  assert.match(observabilitySource, /redacted-api-key/);
  assert.match(observabilitySource, /api\.\?key\|authorization\|prompt/);
  assert.doesNotMatch(observabilitySource, /\|pdf\|/);
  assert.match(observabilitySource, /pdf\.\?buffer/);
});

test("processing events keep external correlation ids without strict entity foreign keys", () => {
  assert.match(
    allMigrationSources,
    /drop constraint if exists processing_events_user_id_fkey/
  );
  assert.match(
    allMigrationSources,
    /drop constraint if exists processing_events_cv_id_fkey/
  );
  assert.match(
    allMigrationSources,
    /drop constraint if exists processing_events_analysis_id_fkey/
  );
});

test("PDF extraction emits per-parser events and no-text aggregate signal", () => {
  assert.match(pdfExtractionSource, /stage: "pdf_parser"/);
  assert.match(pdfExtractionSource, /source: "python_pdfminer_service"/);
  assert.match(pdfExtractionSource, /source: "node_pdfjs"/);
  assert.match(pdfExtractionSource, /source: "node_pdf_parse"/);
  assert.match(pdfExtractionSource, /no_extracted_text_available/);
  assert.match(pdfExtractionSource, /pdfjsErrorMessage/);
  assert.match(pdfExtractionSource, /pythonErrorMessage/);
  assert.match(pdfExtractionSource, /nodeErrorMessage/);
});

test("Node PDF parsers run in-process instead of child Node scripts", () => {
  assert.doesNotMatch(pdfExtractionSource, /execFile/);
  assert.doesNotMatch(pdfExtractionSource, /node_parser\.js/);
  assert.doesNotMatch(pdfExtractionSource, /node_pdfjs_parser\.mjs/);
  assert.match(pdfExtractionSource, /extractWithPdfParse/);
  assert.match(pdfExtractionSource, /extractWithPdfjs/);
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

test("new analysis retries extraction for existing CVs before no-text preflight failure", () => {
  const retryIndex = analysesRouteSource.indexOf("retryCVExtraction");
  const errorIndex = analysesRouteSource.indexOf("No extracted text available");

  assert.notEqual(retryIndex, -1);
  assert.notEqual(errorIndex, -1);
  assert.ok(
    retryIndex < errorIndex,
    "existing CVs without stored text should be re-extracted before returning 400"
  );
  assert.match(analysesRouteSource, /extractPdfText/);
  assert.match(analysesRouteSource, /updateCVExtraction/);
});

test("new analysis creation is extraction-only and never spends AI tokens", () => {
  assert.doesNotMatch(analysesRouteSource, /scoreCVWithAI/);
  assert.doesNotMatch(analysesRouteSource, /stage: "ai_analysis"/);
  assert.doesNotMatch(analysesRouteSource, /google_gemini/);
  assert.match(scoreRouteSource, /scoreCVWithAI/);
  assert.match(aiScoringSource, /stage: "ai_analysis"/);
  assert.match(aiScoringSource, /google_gemini/);
});

test("new analysis flow can create an extraction without a Gemini API key", () => {
  assert.doesNotMatch(
    newAnalysisFlowSource,
    /Configura tu API key de Gemini antes de lanzar el análisis/
  );
  assert.doesNotMatch(newAnalysisFlowSource, /disabled=\{loading \|\| !hasGeminiApiKey\}/);
  assert.match(newAnalysisFlowSource, /Crear extracción/);
});

test("new analysis flow receives every saved CV including template versions", () => {
  const flowStart = appShellSource.indexOf("<NewAnalysisFlow");
  const flowEnd = appShellSource.indexOf("/>", flowStart);
  const flowProps = appShellSource.slice(flowStart, flowEnd);

  assert.match(flowProps, /cvs=\{cvs\}/);
  assert.doesNotMatch(
    flowProps,
    /cvs=\{cvs\.filter\(c => c\.type === "uploaded"\)\}/
  );
  assert.match(newAnalysisFlowSource, /cv\.type === "template"/);
  assert.match(newAnalysisFlowSource, /Plantilla/);
});

test("template CVs create analyses by parsing their rendered PDF", () => {
  assert.match(analysesRouteSource, /cv\.type === "template"/);
  assert.match(analysesRouteSource, /renderTemplatePDF/);
  assert.match(analysesRouteSource, /extractPdfText\(templatePdfBuffer/);
  assert.match(
    analysesRouteSource,
    /text_node:\s*analysisExtraction\.text_node/
  );
  assert.doesNotMatch(analysesRouteSource, /source:\s*"template_profile"/);
});

test("analysis creation records the chosen CV text extraction source", () => {
  const sourceEventIndex = analysesRouteSource.indexOf('stage: "cv_text_extraction"');
  const noTextIndex = analysesRouteSource.indexOf("No extracted text available");

  assert.notEqual(sourceEventIndex, -1);
  assert.notEqual(noTextIndex, -1);
  assert.ok(
    sourceEventIndex < noTextIndex,
    "CV text extraction source should be recorded before returning no-text errors"
  );
  assert.match(analysesRouteSource, /source:\s*cvTextSource/);
  assert.match(analysesRouteSource, /"template_pdf_parse"/);
  assert.match(analysesRouteSource, /"stored_pdf_text"/);
  assert.match(adminObservabilitySource, /cv_text_extraction/);
});
