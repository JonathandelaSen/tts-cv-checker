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
  assert.match(
    migrationSources,
    /alter table public\.cv_structured_profiles enable row level security/
  );
  assert.match(migrationSources, /Users can read their structured CV profiles/);
  assert.match(migrationSources, /Users can create their structured CV profiles/);
  assert.match(migrationSources, /Users can update their structured CV profiles/);
  assert.match(migrationSources, /exists \(\s*select 1\s*from public\.cvs/s);
  assert.match(migrationSources, /cvs\.id = cv_structured_profiles\.cv_id/);
  assert.match(migrationSources, /cvs\.user_id = \(select auth\.uid\(\)\)/);
});

test("structured profile helpers define the reusable standard profile contract", () => {
  assert.ok(exists("src/lib/cv-profile.ts"));
  const source = read("src/lib/cv-profile.ts");

  assert.match(source, /CV_PROFILE_SCHEMA_VERSION\s*=\s*"cv-profile\.v1"/);
  assert.match(source, /export interface StandardCVProfile/);
  for (const key of [
    "basics",
    "summary",
    "experience",
    "education",
    "skills",
    "languages",
    "certifications",
    "projects",
    "awards",
    "publications",
    "volunteering",
  ]) {
    assert.match(source, new RegExp(`${key}[?]?:`));
  }
  assert.match(source, /export function normalizeStandardCVProfile/);
  assert.match(source, /export function getCVSourceTextHash/);
});

test("AI structuring helper is faithful JSON-only extraction", () => {
  assert.ok(exists("src/lib/ai-cv-structuring.ts"));
  const source = read("src/lib/ai-cv-structuring.ts");

  assert.match(source, /structureCVProfileWithAI/);
  assert.match(source, /responseMimeType:\s*"application\/json"/);
  assert.match(source, /Do not invent/i);
  assert.match(source, /Do not rewrite/i);
  assert.match(source, /preserve the original language/i);
  assert.match(source, /normalizeStandardCVProfile/);
});

test("AI editing helper keeps edits JSON-only and rejects unusable profiles", () => {
  assert.ok(exists("src/lib/ai-cv-editing.ts"));
  const source = read("src/lib/ai-cv-editing.ts");

  assert.match(source, /editCVProfileWithAI/);
  assert.match(source, /parseEditedCVProfile/);
  assert.match(source, /responseMimeType:\s*"application\/json"/);
  assert.match(source, /Do not invent/i);
  assert.match(source, /do not change visual styling/i);
  assert.match(source, /normalizeStandardCVProfile/);
  assert.match(source, /AI response did not contain a usable CV profile/);
});

test("structured profile API exposes cache GET and AI-backed POST for CV-owned rows", () => {
  assert.ok(exists("src/app/api/cvs/[id]/structured-profile/route.ts"));
  const source = read("src/app/api/cvs/[id]/structured-profile/route.ts");

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(source, /getCVStructuredProfile/);
  assert.match(source, /upsertCVStructuredProfile/);
  assert.match(source, /geminiApiKey/);
  assert.match(source, /No extracted text available/);
});

test("structured profile edit API is CV-owned and writes normalized AI edits", () => {
  assert.ok(exists("src/app/api/cvs/[id]/structured-profile/edit/route.ts"));
  const source = read("src/app/api/cvs/[id]/structured-profile/edit/route.ts");

  assert.match(source, /export async function POST/);
  assert.match(source, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(source, /getCVStructuredProfile/);
  assert.match(source, /getLatestRecommendationAnalysisForCV/);
  assert.match(source, /editCVProfileWithAI/);
  assert.match(source, /upsertCVStructuredProfile/);
  assert.match(source, /geminiApiKey/);
  assert.match(source, /instruction/);
  assert.match(source, /Structured profile not found/);
});

test("CV template selection persists active template without touching the original PDF", () => {
  assert.match(migrationSources, /active_template_id text/);
  assert.match(migrationSources, /template_locale text not null default 'es'/);
  assert.ok(exists("src/app/api/cvs/[id]/template/route.ts"));
  const source = read("src/app/api/cvs/[id]/template/route.ts");

  assert.match(source, /export async function POST/);
  assert.match(source, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(source, /getCVStructuredProfile/);
  assert.match(source, /structureCVProfileWithAI/);
  assert.match(source, /createCVTemplateVersion/);
  assert.doesNotMatch(source, /pdf_storage_path:\s*/);
  assert.doesNotMatch(source, /text_python:\s*/);
});

test("template recommendations API returns the latest analyzed CV recommendations", () => {
  assert.ok(exists("src/app/api/cvs/[id]/recommendations/route.ts"));
  const source = read("src/app/api/cvs/[id]/recommendations/route.ts");

  assert.match(source, /export async function GET/);
  assert.match(source, /getCV\(supabase,\s*id,\s*user\.id\)/);
  assert.match(source, /getLatestRecommendationAnalysisForCV/);
});

test("template registry ships the Linea preview and shared locale labels", () => {
  assert.ok(exists("src/lib/cv-templates.ts"));
  const source = read("src/lib/cv-templates.ts");

  assert.match(source, /CV_TEMPLATES/);
  assert.match(source, /fixtureProfile/);
  assert.match(source, /templateId:\s*"compact"/);
  assert.match(source, /name:\s*"Linea"/);
  assert.match(source, /SECTION_LABELS/);
  assert.match(source, /about:\s*"About me"/);
  assert.match(source, /about:\s*"Sobre mí"/);
});

test("templates UI is reachable from app shell and sidebar", () => {
  const appShell = read("src/components/app-shell.tsx");
  const sidebar = read("src/components/sidebar.tsx");
  const templatesView = read("src/components/templates-view.tsx");
  const editorView = read("src/components/cv-editor-view.tsx");

  assert.match(appShell, /type AppView =[\s\S]*"templates"/);
  assert.match(appShell, /type AppView =[\s\S]*"editor"/);
  assert.match(appShell, /TemplatesView/);
  assert.match(appShell, /CVEditorView/);
  assert.match(appShell, /view=templates/);
  assert.match(appShell, /view=editor/);
  assert.match(sidebar, /onOpenTemplates/);
  assert.match(sidebar, /onOpenEditor/);
  assert.match(sidebar, /Plantillas/);
  assert.match(sidebar, /Editor/);
  assert.match(templatesView, /\/template/);
  assert.doesNotMatch(templatesView, /Edición asistida/);
  assert.match(editorView, /Editor IA/);
  assert.match(editorView, /Aplicar cambios/);
  assert.match(editorView, /Recomendaciones/);
  assert.match(editorView, /cv-template-versions/);
  assert.match(editorView, /\/recommendations/);
  assert.match(editorView, /original subido se conserva/i);
});

test("template PDF endpoint renders from cached structured data without storing exports", () => {
  assert.ok(exists("src/app/api/cvs/[id]/templates/[templateId]/pdf/route.ts"));
  const source = read("src/app/api/cvs/[id]/templates/[templateId]/pdf/route.ts");

  assert.match(source, /getCVStructuredProfile/);
  assert.match(source, /renderTemplatePDF/);
  assert.match(source, /application\/pdf/);
  assert.doesNotMatch(source, /\.upload\(/);

  assert.ok(exists("src/app/api/cvs/[id]/template-pdf/route.ts"));
  const activeSource = read("src/app/api/cvs/[id]/template-pdf/route.ts");
  assert.match(activeSource, /active_template_id/);
  assert.match(activeSource, /template_locale/);
  assert.match(activeSource, /renderTemplatePDF/);
  assert.doesNotMatch(activeSource, /\.upload\(/);
});
