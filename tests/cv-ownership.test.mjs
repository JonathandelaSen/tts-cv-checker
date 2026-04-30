import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dbSource = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
const migrations = [
  new URL(
    "../supabase/migrations/20260428161445_create_analyses_and_storage.sql",
    import.meta.url
  ),
  new URL(
    "../supabase/migrations/20260429181908_add_cvs_and_richer_analyses.sql",
    import.meta.url
  ),
  new URL(
    "../supabase/migrations/20260430223221_harden_cv_analysis_ownership.sql",
    import.meta.url
  ),
]
  .map((url) => readFileSync(url, "utf8"))
  .join("\n");

test("CV and analysis helper reads are explicitly scoped to the current user", () => {
  for (const table of ["cvs", "analyses"]) {
    const tableIndex = dbSource.indexOf(`.from("${table}")`);
    assert.notEqual(tableIndex, -1, `${table} helper should query ${table}`);

    const userFilterIndex = dbSource.indexOf('.eq("user_id", userId)', tableIndex);
    assert.notEqual(
      userFilterIndex,
      -1,
      `${table} helper should include an explicit user_id filter`
    );
  }
});

test("RLS policies isolate CV and analysis rows by authenticated user", () => {
  assert.match(migrations, /alter table public\.cvs enable row level security/);
  assert.match(migrations, /alter table public\.analyses enable row level security/);
  assert.match(migrations, /using \(\(select auth\.uid\(\)\) = user_id\)/);
});

test("analysis writes must reference a CV owned by the authenticated user", () => {
  assert.match(migrations, /drop policy if exists "Users can create their analyses"/);
  assert.match(migrations, /drop policy if exists "Users can update their analyses"/);
  assert.match(migrations, /exists \(\s*select 1\s*from public\.cvs/s);
  assert.match(migrations, /cvs\.id = analyses\.cv_id/);
  assert.match(migrations, /cvs\.user_id = \(select auth\.uid\(\)\)/);
});

test("stored PDF paths must stay under the owning user's folder", () => {
  assert.match(migrations, /cvs_pdf_storage_path_user_prefix/);
  assert.match(migrations, /analyses_pdf_storage_path_user_prefix/);
  assert.match(migrations, /split_part\(pdf_storage_path, '\/', 1\) = user_id::text/);
  assert.match(migrations, /bucket_id = 'cv-pdfs'/);
  assert.match(
    migrations,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/
  );
});
