import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const exists = (path) => existsSync(new URL(path, root));

const migrationSources = readdirSync(new URL("supabase/migrations", root))
  .filter((filename) => filename.endsWith(".sql"))
  .sort()
  .map((filename) => read(`supabase/migrations/${filename}`))
  .join("\n");

test("structured CV profile migration creates an owned cache table with RLS", () => {
  assert.match(migrationSources, /create table public\.cv_structured_profiles/);
  assert.match(migrationSources, /schema_version text not null/);
  assert.match(migrationSources, /source_text_hash text not null/);
  assert.match(migrationSources, /profile jsonb not null/);
  assert.match(
    migrationSources,
    /unique\s*\(\s*cv_id\s*,\s*schema_version\s*\)/i
  );
});

test("CV template versions migration creates a table for derived CVs", () => {
  assert.match(migrationSources, /create table if not exists public\.cv_template_versions/);
  assert.match(migrationSources, /source_cv_id uuid not null references public\.cvs/);
  assert.match(migrationSources, /template_id text not null/);
  assert.match(migrationSources, /profile jsonb not null/);
  assert.match(migrationSources, /Users can read their CV template versions/);
  assert.match(migrationSources, /exists \(\s*select 1\s*from public\.cvs/s);
});

test("structured profile helpers define the reusable standard profile contract", () => {
  assert.ok(exists("src/lib/cv-profile.ts"));
  const source = read("src/lib/cv-profile.ts");

  assert.match(source, /CV_PROFILE_SCHEMA_VERSION\s*=\s*"cv-profile\.v1"/);
  assert.match(source, /export interface StandardCVProfile/);
  assert.match(source, /export function normalizeStandardCVProfile/);
});

test("AI structuring helper is faithful JSON-only extraction", () => {
  assert.ok(exists("src/lib/ai-cv-structuring.ts"));
  const source = read("src/lib/ai-cv-structuring.ts");
  assert.match(source, /structureCVProfileWithAI/);
});

test("AI editing helper keeps edits JSON-only and rejects unusable profiles", () => {
  assert.ok(exists("src/lib/ai-cv-editing.ts"));
  const source = read("src/lib/ai-cv-editing.ts");
  assert.match(source, /editCVProfileWithAI/);
  assert.match(source, /parseEditedCVProfile/);
});

test("unified template CV endpoints handle CRUD and AI edits", () => {
  assert.ok(exists("src/app/api/cvs/[id]/route.ts"));
  assert.ok(exists("src/app/api/cvs/[id]/edit/route.ts"));
  assert.ok(exists("src/app/api/cvs/[id]/template-pdf/route.ts"));

  const editSource = read("src/app/api/cvs/[id]/edit/route.ts");
  assert.match(editSource, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(editSource, /editCVProfileWithAI/);
  assert.match(editSource, /updateCVProfile/);
  assert.match(editSource, /cv\.type !== "template"/);
});

test("CV template selection creates a new version from original", () => {
  assert.ok(exists("src/app/api/cvs/[id]/template/route.ts"));
  const source = read("src/app/api/cvs/[id]/template/route.ts");

  assert.match(source, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(source, /getCVStructuredProfile/);
  assert.match(source, /createTemplateCV/);
});

test("template recommendations API returns the latest analyzed CV recommendations", () => {
  assert.ok(exists("src/app/api/cvs/[id]/recommendations/route.ts"));
  const source = read("src/app/api/cvs/[id]/recommendations/route.ts");
  assert.match(source, /getLatestRecommendationAnalysisForCV/);
});

test("templates UI is reachable and follows the new catalog -> editor flow", () => {
  const appShell = read("src/components/app-shell.tsx");
  const sidebar = read("src/components/sidebar.tsx");
  const templatesView = read("src/components/templates-view.tsx");
  const editorView = read("src/components/cv-editor-view.tsx");

  assert.match(appShell, /TemplatesView/);
  assert.match(appShell, /CVEditorView/);
  assert.match(sidebar, /onOpenTemplates/);
  assert.match(sidebar, /onOpenEditor/);
  assert.match(templatesView, /Catálogo de Plantillas/);
  assert.match(templatesView, /handleCreateVersion/);
  assert.match(editorView, /Editor IA/);
  assert.match(editorView, /Canvas/i);
});
