import "server-only";
import { db, tx } from "./db";
import {
  ACTIVE_STATUSES,
  STATUS_LABEL,
  TERMINAL_STATUSES,
  type Application,
  type EmploymentModel,
  type Status,
  type TechArea,
  type TimelineEvent,
  type WorkplaceModel,
} from "./types";

type AppRow = {
  id: number;
  company: string;
  role: string | null;
  platform: string | null;
  status: Status;
  status_locked: number;
  applied_on: string;
  last_activity_at: string;
  tech_area: TechArea | null;
  employment_model: EmploymentModel | null;
  workplace_model: WorkplaceModel | null;
  location: string | null;
  job_url: string | null;
  notes: string | null;
  email_count: number;
};

const SELECT_APP = `
  SELECT a.*, (SELECT COUNT(*) FROM emails e WHERE e.application_id = a.id) AS email_count
  FROM applications a`;

function toApp(r: AppRow): Application {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    platform: r.platform,
    status: r.status,
    statusLocked: r.status_locked === 1,
    appliedOn: r.applied_on,
    lastActivityAt: r.last_activity_at,
    techArea: r.tech_area,
    employmentModel: r.employment_model,
    workplaceModel: r.workplace_model,
    location: r.location,
    jobUrl: r.job_url,
    notes: r.notes,
    emailCount: r.email_count,
  };
}

const COMPANY_NOISE = new Set([
  "inc", "llc", "ltd", "limited", "pvt", "private", "corp", "corporation", "co", "company", "gmbh",
  "plc", "technologies", "technology", "tech", "labs", "software", "solutions", "systems", "the",
  "hq", "careers", "jobs", "team", "recruiting", "recruitment", "talent", "hiring", "india", "global",
]);

/** "Acme Technologies Pvt. Ltd." and "acme" should land on the same application. */
export function companyKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !COMPANY_NOISE.has(w));
  return (kept.length ? kept : words).join(" ");
}

// Words that appear in most titles and say nothing about which job it is.
const GENERIC_ROLE_WORDS = new Set([
  "and", "the", "for", "with", "of", "engineer", "engineering", "developer", "development", "software",
  "senior", "sr", "junior", "jr", "lead", "staff", "principal", "associate", "intern", "ii", "iii", "iv",
  "sde", "swe", "remote", "contract", "full-time", "fulltime", "position", "role", "specialist",
]);

function roleTokens(role: string | null): Set<string> {
  return new Set(
    (role ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9+#. -]+/g, " ")
      .split(/[\s/]+/)
      .filter((w) => w.length > 1 && !GENERIC_ROLE_WORDS.has(w)),
  );
}

/** Share of distinctive title words in common, or null if either title has none (e.g. "Software Engineer"). */
function roleSimilarity(a: string | null, b: string | null): number | null {
  const ta = roleTokens(a);
  const tb = roleTokens(b);
  if (!ta.size || !tb.size) return null;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

export function listApplications(): Application[] {
  const rows = db().prepare(`${SELECT_APP} ORDER BY a.last_activity_at DESC`).all() as AppRow[];
  return rows.map(toApp);
}

export function getApplication(id: number): { app: Application; events: TimelineEvent[] } | null {
  const row = db().prepare(`${SELECT_APP} WHERE a.id = ?`).get(id) as AppRow | undefined;
  if (!row) return null;
  const events = db()
    .prepare(
      `SELECT id, application_id AS applicationId, kind, status, title, detail, occurred_at AS occurredAt, gmail_id AS gmailId
       FROM events WHERE application_id = ? ORDER BY occurred_at DESC, id DESC`,
    )
    .all(id) as TimelineEvent[];
  return { app: toApp(row), events };
}

/**
 * Find the application an email belongs to: same Gmail thread first, then same company
 * (picking the closest role title when there are several).
 */
export function findMatchingApplication(threadId: string, company: string, role: string | null): number | null {
  const byThread = db()
    .prepare("SELECT application_id FROM emails WHERE thread_id = ? AND application_id IS NOT NULL LIMIT 1")
    .get(threadId) as { application_id: number } | undefined;
  if (byThread) return byThread.application_id;

  const candidates = db()
    .prepare("SELECT id, role FROM applications WHERE company_key = ? ORDER BY last_activity_at DESC")
    .all(companyKey(company)) as { id: number; role: string | null }[];
  if (candidates.length === 0) return null;

  // Prefer the closest title; titles we can't compare fall back to the most recent application.
  let best: number | null = null;
  let bestScore = 0;
  let fallback: number | null = null;
  for (const c of candidates) {
    const score = roleSimilarity(role, c.role);
    if (score === null) fallback ??= c.id;
    else if (score > bestScore) {
      best = c.id;
      bestScore = score;
    }
  }
  // Same company but every comparable title differs -> a separate application.
  return best ?? fallback;
}

const RANK: Record<Status, number> = {
  applied: 0,
  ghosted: 0,
  screening: 1,
  assessment: 2,
  interview: 3,
  offer: 10,
  rejected: 10,
  withdrawn: 10,
};

/** Decide whether a status detected in an email should replace the current one. */
export function shouldAdvance(current: Status, detected: Status): boolean {
  if (detected === current) return false;
  if (TERMINAL_STATUSES.includes(detected)) return true;
  if (TERMINAL_STATUSES.includes(current)) return false;
  return RANK[detected] > RANK[current] || current === "ghosted";
}

export type NewApplication = {
  company: string;
  role?: string | null;
  platform?: string | null;
  status?: Status;
  appliedOn: string;
  techArea?: TechArea | null;
  employmentModel?: EmploymentModel | null;
  workplaceModel?: WorkplaceModel | null;
  location?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
  statusLocked?: boolean;
};

export function createApplication(input: NewApplication, occurredAt = new Date().toISOString()): number {
  return tx(() => {
    const status = input.status ?? "applied";
    const res = db()
      .prepare(
        `INSERT INTO applications (company, company_key, role, platform, status, status_locked, applied_on,
           last_activity_at, tech_area, employment_model, workplace_model, location, job_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.company,
        companyKey(input.company),
        input.role ?? null,
        input.platform ?? null,
        status,
        input.statusLocked ? 1 : 0,
        input.appliedOn,
        occurredAt,
        input.techArea ?? null,
        input.employmentModel ?? null,
        input.workplaceModel ?? null,
        input.location ?? null,
        input.jobUrl ?? null,
        input.notes ?? null,
      );
    const id = Number(res.lastInsertRowid);
    addEvent(id, { kind: "created", status, title: "Application added", occurredAt });
    return id;
  });
}

export function addEvent(
  applicationId: number,
  e: { kind: TimelineEvent["kind"]; status?: Status | null; title: string; detail?: string | null; occurredAt: string; gmailId?: string | null },
) {
  db()
    .prepare(
      "INSERT INTO events (application_id, kind, status, title, detail, occurred_at, gmail_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(applicationId, e.kind, e.status ?? null, e.title, e.detail ?? null, e.occurredAt, e.gmailId ?? null);
}

export type ApplicationPatch = Partial<{
  company: string;
  role: string | null;
  platform: string | null;
  status: Status;
  statusLocked: boolean;
  appliedOn: string;
  techArea: TechArea | null;
  employmentModel: EmploymentModel | null;
  workplaceModel: WorkplaceModel | null;
  location: string | null;
  jobUrl: string | null;
  notes: string | null;
}>;

const PATCH_COLUMNS: Record<keyof ApplicationPatch, string> = {
  company: "company",
  role: "role",
  platform: "platform",
  status: "status",
  statusLocked: "status_locked",
  appliedOn: "applied_on",
  techArea: "tech_area",
  employmentModel: "employment_model",
  workplaceModel: "workplace_model",
  location: "location",
  jobUrl: "job_url",
  notes: "notes",
};

/** User edits from the UI. Setting a status by hand locks it against email updates. */
export function updateApplication(id: number, patch: ApplicationPatch) {
  tx(() => {
    const current = db().prepare("SELECT status FROM applications WHERE id = ?").get(id) as { status: Status } | undefined;
    if (!current) throw new Error("Application not found");

    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(patch) as [keyof ApplicationPatch, unknown][]) {
      if (value === undefined || !(key in PATCH_COLUMNS)) continue;
      sets.push(`${PATCH_COLUMNS[key]} = ?`);
      values.push(typeof value === "boolean" ? (value ? 1 : 0) : (value as string | null));
    }
    if (patch.company) {
      sets.push("company_key = ?");
      values.push(companyKey(patch.company));
    }
    if (patch.status && patch.status !== current.status) {
      if (patch.statusLocked === undefined) {
        sets.push("status_locked = 1");
      }
      sets.push("last_activity_at = ?");
      values.push(new Date().toISOString());
    }
    if (sets.length === 0) return;
    db().prepare(`UPDATE applications SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);

    if (patch.status && patch.status !== current.status) {
      addEvent(id, {
        kind: "status_change",
        status: patch.status,
        title: `Status set to ${STATUS_LABEL[patch.status]} (manual)`,
        occurredAt: new Date().toISOString(),
      });
    }
  });
}

export function deleteApplication(id: number) {
  db().prepare("DELETE FROM applications WHERE id = ?").run(id);
}

/** Applications with no news for `days` days are marked ghosted (unless the user set the status). */
export function markGhosted(days: number): number {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const placeholders = ACTIVE_STATUSES.map(() => "?").join(",");
  const stale = db()
    .prepare(
      `SELECT id, last_activity_at FROM applications WHERE status_locked = 0 AND status IN (${placeholders}) AND last_activity_at < ?`,
    )
    .all(...ACTIVE_STATUSES, cutoff) as { id: number; last_activity_at: string }[];
  tx(() => {
    for (const { id, last_activity_at } of stale) {
      db().prepare("UPDATE applications SET status = 'ghosted' WHERE id = ?").run(id);
      addEvent(id, {
        kind: "status_change",
        status: "ghosted",
        title: `No response for ${days}+ days`,
        // Date it from when the silence crossed the threshold, not from today's sync.
        occurredAt: new Date(new Date(last_activity_at).getTime() + days * 86_400_000).toISOString(),
      });
    }
  });
  return stale.length;
}

export type RecentEvent = TimelineEvent & { company: string; role: string | null };

export function recentEvents(limit = 12): RecentEvent[] {
  return db()
    .prepare(
      `SELECT ev.id, ev.application_id AS applicationId, ev.kind, ev.status, ev.title, ev.detail,
              ev.occurred_at AS occurredAt, ev.gmail_id AS gmailId, a.company, a.role
       FROM events ev JOIN applications a ON a.id = ev.application_id
       WHERE ev.kind = 'email' OR (ev.kind = 'status_change' AND ev.title LIKE '%(manual)')
       ORDER BY ev.occurred_at DESC, ev.id DESC LIMIT ?`,
    )
    .all(limit) as RecentEvent[];
}

/** Every email the sync has stored, and how many of them were job-related. */
export function emailCounts(): { total: number; jobRelated: number } {
  return db()
    .prepare("SELECT COUNT(*) AS total, COALESCE(SUM(is_job), 0) AS jobRelated FROM emails")
    .get() as { total: number; jobRelated: number };
}
