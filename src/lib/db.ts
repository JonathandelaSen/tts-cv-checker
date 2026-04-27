import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "cv-checker.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Create table if not exists
  _db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_size INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      text_python TEXT,
      text_pdfjs TEXT,
      text_node TEXT,
      extract_error_python TEXT,
      extract_error_pdfjs TEXT,
      extract_error_node TEXT,

      ai_model TEXT,
      job_description TEXT,
      ai_score INTEGER,
      ai_feedback TEXT,
      ai_keywords TEXT,
      ai_improvements TEXT,
      ai_analyzed_at TEXT
    );
  `);

  return _db;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Analysis {
  id: string;
  filename: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
  ai_model: string | null;
  job_description: string | null;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_keywords: string | null; // JSON stringified array
  ai_improvements: string | null; // JSON stringified array
  ai_analyzed_at: string | null;
}

export interface AnalysisSummary {
  id: string;
  filename: string;
  created_at: string;
  ai_score: number | null;
  ai_analyzed_at: string | null;
}

// ---------------------------------------------------------------------------
// CRUD Helpers
// ---------------------------------------------------------------------------

export interface CreateAnalysisInput {
  filename: string;
  file_size: number | null;
  text_python: string | null;
  text_pdfjs: string | null;
  text_node: string | null;
  extract_error_python: string | null;
  extract_error_pdfjs: string | null;
  extract_error_node: string | null;
}

export function createAnalysis(data: CreateAnalysisInput): Analysis {
  const db = getDb();
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO analyses (
      id, filename, file_size,
      text_python, text_pdfjs, text_node,
      extract_error_python, extract_error_pdfjs, extract_error_node
    ) VALUES (
      @id, @filename, @file_size,
      @text_python, @text_pdfjs, @text_node,
      @extract_error_python, @extract_error_pdfjs, @extract_error_node
    )
  `);
  stmt.run({ id, ...data });
  return getAnalysis(id)!;
}

export interface UpdateAIInput {
  ai_model: string;
  job_description: string | null;
  ai_score: number;
  ai_feedback: string;
  ai_keywords: string[];
  ai_improvements: string[];
}

export function updateAnalysisWithAI(
  id: string,
  data: UpdateAIInput
): Analysis | null {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE analyses SET
      ai_model = @ai_model,
      job_description = @job_description,
      ai_score = @ai_score,
      ai_feedback = @ai_feedback,
      ai_keywords = @ai_keywords,
      ai_improvements = @ai_improvements,
      ai_analyzed_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({
    id,
    ai_model: data.ai_model,
    job_description: data.job_description,
    ai_score: data.ai_score,
    ai_feedback: data.ai_feedback,
    ai_keywords: JSON.stringify(data.ai_keywords),
    ai_improvements: JSON.stringify(data.ai_improvements),
  });
  return getAnalysis(id);
}

export function getAnalysis(id: string): Analysis | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM analyses WHERE id = ?")
    .get(id) as Analysis | undefined;
  return row ?? null;
}

export function listAnalyses(): AnalysisSummary[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, filename, created_at, ai_score, ai_analyzed_at FROM analyses ORDER BY created_at DESC"
    )
    .all() as AnalysisSummary[];
}

export function deleteAnalysis(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM analyses WHERE id = ?").run(id);
  return result.changes > 0;
}
