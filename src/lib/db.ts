import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
// JOB_TRACKER_DB lets you point at a different file (e.g. a demo database).
const DB_PATH = process.env.JOB_TRACKER_DB ? path.resolve(process.env.JOB_TRACKER_DB) : path.join(DATA_DIR, "job-tracker.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  company_key TEXT NOT NULL,
  role TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  status_locked INTEGER NOT NULL DEFAULT 0,
  applied_on TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  tech_area TEXT,
  employment_model TEXT,
  workplace_model TEXT,
  location TEXT,
  job_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_app_company ON applications(company_key);

-- Every Gmail message we have looked at, job-related or not, so it is never classified twice.
CREATE TABLE IF NOT EXISTS emails (
  gmail_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  sender TEXT,
  subject TEXT,
  received_at TEXT NOT NULL,
  is_job INTEGER NOT NULL,
  detected_status TEXT,
  summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_thread ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_app ON emails(application_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  occurred_at TEXT NOT NULL,
  gmail_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_app ON events(application_id, occurred_at);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// Reuse one connection across hot reloads in dev.
const g = globalThis as unknown as { __jobTrackerDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__jobTrackerDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new DatabaseSync(DB_PATH);
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    conn.exec(SCHEMA);
    g.__jobTrackerDb = conn;
  }
  return g.__jobTrackerDb;
}

let txDepth = 0;

/** Run `fn` in a transaction. Nested calls join the outer transaction. */
export function tx<T>(fn: () => T): T {
  if (txDepth > 0) return fn();
  const conn = db();
  conn.exec("BEGIN");
  txDepth++;
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  } finally {
    txDepth--;
  }
}

export function getKv(key: string): string | null {
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setKv(key: string, value: string | null) {
  if (value === null) {
    db().prepare("DELETE FROM kv WHERE key = ?").run(key);
  } else {
    db()
      .prepare("INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }
}
