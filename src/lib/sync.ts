import "server-only";
import { db, getKv, setKv, tx } from "./db";
import { gmailClient } from "./google";
import { buildSearchQueries, fetchEmail, listMessageIds, type ParsedEmail } from "./gmail";
import { aiConcurrency, classifyEmail, describeAiError, type EmailClassification } from "./classify";
import { addEvent, createApplication, findMatchingApplication, markGhosted, shouldAdvance } from "./applications";
import {
  DEFAULT_FIRST_SYNC_RANGE,
  STATUS_LABEL,
  type FirstSyncRange,
  type Status,
  type SyncState,
} from "./types";

const BATCH_SIZE = 25;
const RANGE_MONTHS: Record<Exclude<FirstSyncRange, "all">, number> = { "1y": 12, "6m": 6, "3m": 3, "1m": 1 };

export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** True once the first sync's start date has been fixed. */
export function hasSyncStart(): boolean {
  return Boolean(getKv("sync_start_at"));
}

/**
 * Fix the earliest email date the app will ever read, from the range chosen on first connect.
 * Does nothing once a start date exists, so the range only applies to the first sync.
 */
export function setSyncStart(range: FirstSyncRange) {
  if (hasSyncStart()) return;
  const start = new Date(0);
  if (range !== "all") {
    start.setTime(Date.now());
    start.setMonth(start.getMonth() - RANGE_MONTHS[range]);
  }
  setKv("sync_start_at", start.toISOString());
}

/** Earliest email date the app will ever read, fixed when the first sync runs. */
export function syncStartDate(): Date {
  setSyncStart(DEFAULT_FIRST_SYNC_RANGE);
  return new Date(getKv("sync_start_at")!);
}

export function ghostedDays(): number {
  return Number(getKv("ghosted_days") ?? 30);
}

const g = globalThis as unknown as { __jobTrackerSync?: SyncState };
function state(): SyncState {
  g.__jobTrackerSync ??= {
    running: false,
    phase: "idle",
    processed: 0,
    total: 0,
    added: 0,
    updated: 0,
    error: null,
    lastSyncAt: null,
  };
  g.__jobTrackerSync.lastSyncAt = getKv("last_sync_at");
  return g.__jobTrackerSync;
}

export function getSyncState(): SyncState {
  return { ...state() };
}

/** Start a sync in the background. Returns false if one is already running. */
export function startSync(): boolean {
  const s = state();
  if (s.running) return false;
  Object.assign(s, { running: true, phase: "Searching Gmail", processed: 0, total: 0, added: 0, updated: 0, error: null });
  runSync(s)
    .catch((err) => {
      s.error = friendlyError(err);
      console.error("[sync] failed:", err);
    })
    .finally(() => {
      s.running = false;
      s.phase = "idle";
    });
  return true;
}

function friendlyError(err: unknown): string {
  const ai = describeAiError(err);
  if (ai) return ai.message;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("invalid_grant")) return "Google access expired or was revoked. Reconnect Gmail in Settings.";
  return msg;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function runSync(s: SyncState) {
  const gmail = gmailClient();
  const floor = syncStartDate();
  const lastSync = getKv("last_sync_at");
  // Re-scan a small overlap on later syncs (already-seen emails are skipped by id),
  // but never go earlier than the start date.
  const after = lastSync
    ? new Date(Math.max(floor.getTime(), new Date(lastSync).getTime() - 2 * 86_400_000))
    : floor;

  const found = new Map<string, string>();
  for (const q of buildSearchQueries(after)) {
    for (const m of await listMessageIds(gmail, q)) found.set(m.id, m.threadId);
  }

  // Emails that failed last time are retried by id, even if they fall outside the search window.
  const retryIds: string[] = JSON.parse(getKv("retry_ids") ?? "[]");
  for (const id of retryIds) if (!found.has(id)) found.set(id, "");

  const seen = new Set(
    (db().prepare("SELECT gmail_id FROM emails").all() as { gmail_id: string }[]).map((r) => r.gmail_id),
  );
  // Gmail ids grow over time, so sorting them processes mail roughly oldest-first.
  const todo = [...found.keys()]
    .filter((id) => !seen.has(id))
    .sort((a, b) => (BigInt(`0x${a}`) < BigInt(`0x${b}`) ? -1 : 1));

  s.total = todo.length;
  s.phase = todo.length ? "Reading and classifying emails" : "No new emails";

  const failed: string[] = [];
  const done = new Set<string>();
  let fatal: unknown = null;
  for (let i = 0; i < todo.length && !fatal; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const results = await pool(batch, aiConcurrency(), async (id) => {
      if (fatal) return null;
      try {
        const email = await fetchEmail(gmail, id);
        // Anything older than the start date is recorded as skipped without being sent to the AI.
        if (email.date < floor.toISOString()) {
          done.add(id);
          return { email, result: null };
        }
        const result = await classifyEmail(email);
        done.add(id);
        return { email, result };
      } catch (err) {
        // Stop on problems that will affect every email (bad key, quota, expired Google access);
        // skip one-off failures and retry them next sync.
        if (describeAiError(err)?.fatal || String(err).includes("invalid_grant")) fatal ??= err;
        else {
          console.error(`[sync] skipping ${id}:`, err);
          failed.push(id);
        }
        return null;
      } finally {
        s.processed++;
      }
    });

    // Save whatever finished, even if the batch stopped early.
    const ok = results.filter((r): r is { email: ParsedEmail; result: EmailClassification | null } => r !== null);
    ok.sort((a, b) => a.email.date.localeCompare(b.email.date));
    tx(() => {
      for (const { email, result } of ok) applyEmail(s, email, result);
    });
  }

  // Keep old retries that never got their turn because the sync stopped early.
  const stillToRetry = [...new Set([...failed, ...retryIds.filter((id) => !done.has(id) && !seen.has(id))])];
  setKv("retry_ids", stillToRetry.length ? JSON.stringify(stillToRetry) : null);
  // On a fatal stop, keep the old sync time so the next run searches the same window again.
  if (fatal) throw fatal;

  markGhosted(ghostedDays());
  setKv("last_sync_at", new Date().toISOString());
  if (failed.length) s.error = `${failed.length} email(s) could not be processed and will be retried on the next sync.`;
}

export function applyEmail(s: Pick<SyncState, "added" | "updated">, email: ParsedEmail, c: EmailClassification | null) {
  const insertEmail = db().prepare(
    `INSERT OR IGNORE INTO emails (gmail_id, thread_id, application_id, sender, subject, received_at, is_job, detected_status, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  if (!c || !c.is_application_update || !c.company) {
    insertEmail.run(email.id, email.threadId, null, email.from, email.subject, email.date, 0, null, c?.summary ?? null);
    return;
  }

  const status = c.status as Status;
  let appId = findMatchingApplication(email.threadId, c.company, c.role);

  if (appId === null) {
    appId = createApplication(
      {
        company: c.company,
        role: c.role,
        platform: c.platform,
        status,
        appliedOn: localDate(email.date),
        techArea: c.tech_area,
        employmentModel: c.employment_model,
        workplaceModel: c.workplace_model,
        location: c.location,
        jobUrl: c.job_url,
      },
      email.date,
    );
    s.added++;
  } else {
    const app = db()
      .prepare("SELECT status, status_locked, applied_on, last_activity_at FROM applications WHERE id = ?")
      .get(appId) as { status: Status; status_locked: number; applied_on: string; last_activity_at: string };

    const advance = app.status_locked === 0 && shouldAdvance(app.status, status);
    db()
      .prepare(
        `UPDATE applications SET
           status = ?,
           applied_on = MIN(applied_on, ?),
           last_activity_at = MAX(last_activity_at, ?),
           role = COALESCE(role, ?),
           platform = COALESCE(platform, ?),
           tech_area = COALESCE(tech_area, ?),
           employment_model = COALESCE(employment_model, ?),
           workplace_model = COALESCE(workplace_model, ?),
           location = COALESCE(location, ?),
           job_url = COALESCE(job_url, ?)
         WHERE id = ?`,
      )
      .run(
        advance ? status : app.status,
        localDate(email.date),
        email.date,
        c.role,
        c.platform,
        c.tech_area,
        c.employment_model,
        c.workplace_model,
        c.location,
        c.job_url,
        appId,
      );
    if (advance) {
      addEvent(appId, { kind: "status_change", status, title: `Moved to ${STATUS_LABEL[status]}`, occurredAt: email.date });
    }
    s.updated++;
  }

  insertEmail.run(email.id, email.threadId, appId, email.from, email.subject, email.date, 1, status, c.summary);
  addEvent(appId, {
    kind: "email",
    status,
    title: email.subject || "(no subject)",
    detail: c.summary,
    occurredAt: email.date,
    gmailId: email.id,
  });
}
