// Fills a separate demo database with fake emails, pushed through the same code the real
// Gmail sync uses (matching, status updates, ghosting). Your real data is not touched.
//
//   npm run demo:seed   then   npm run demo
import { applyEmail } from "../src/lib/sync";
import { markGhosted, listApplications } from "../src/lib/applications";
import { db } from "../src/lib/db";
import type { EmailClassification } from "../src/lib/classify";
import type { ParsedEmail } from "../src/lib/gmail";

if (!process.env.JOB_TRACKER_DB?.includes("demo")) {
  throw new Error("Refusing to seed: set JOB_TRACKER_DB to a demo database path (use `npm run demo:seed`).");
}

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

const COMPANIES = [
  "Razorpay", "Postman", "Zerodha", "Atlassian", "Swiggy", "Stripe", "Vercel", "Supabase", "Deel",
  "Remote.com", "GitLab", "Automattic", "Canva", "Freshworks", "BrowserStack", "Hasura", "Toptal",
  "Turing", "CRED", "Groww", "Meesho", "PhonePe", "Linear", "Doist", "Sentry", "Grafana Labs",
  "Clevertap", "Chargebee", "Zoho", "InVideo", "Juspay", "Setu", "Plane", "Appsmith", "ToolJet",
  "Hashnode", "Directus", "Airbyte", "PostHog", "Cal.com", "Mattermost", "Ghost", "Buffer", "Zapier",
  "Toggl", "Hotjar", "Wise", "Revolut", "N26", "Miro",
];
const ROLES = [
  ["Frontend Engineer", "frontend"], ["Senior Frontend Developer", "frontend"], ["React Developer", "frontend"],
  ["Backend Engineer", "backend"], ["Node.js Developer", "backend"], ["Senior Backend Engineer (Go)", "backend"],
  ["Full Stack Engineer", "fullstack"], ["Software Engineer - Full Stack", "fullstack"],
  ["React Native Developer", "mobile"], ["Flutter Developer", "mobile"],
  ["DevOps Engineer", "cloud_devops"], ["Cloud Engineer (AWS)", "cloud_devops"],
] as const;
const PLATFORMS = ["LinkedIn", "Naukri", "Wellfound", "Instahyre", "Cutshort", "Company website", "Himalayas", "Upwork", "Turing", "Referral"];
const EMPLOYMENT = ["fte", "fte", "fte", "contractor", "freelance", "agency"] as const;
const WORKPLACE = ["remote", "remote", "hybrid", "onsite", "nomad"] as const;

const DAY = 86_400_000;
let n = 0;
const counters = { added: 0, updated: 0 };

function send(company: string, role: string, thread: string, when: number, c: Partial<EmailClassification>, subject: string) {
  n++;
  const email: ParsedEmail = {
    id: (0x18f0000000 + n).toString(16),
    threadId: thread,
    from: `careers@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    to: "me@example.com",
    subject,
    date: new Date(when).toISOString(),
    body: "",
  };
  applyEmail(counters, email, {
    is_application_update: true,
    company,
    role,
    platform: null,
    status: "applied",
    summary: subject,
    tech_area: null,
    employment_model: null,
    workplace_model: null,
    location: null,
    job_url: null,
    ...c,
  });
}

// Wipe the demo DB.
db().exec("DELETE FROM events; DELETE FROM emails; DELETE FROM applications; DELETE FROM kv;");

type Flow = { at: number; status: EmailClassification["status"]; subject: string }[];
const now = Date.now();
const emails: { company: string; role: string; thread: string; at: number; c: Partial<EmailClassification>; subject: string }[] = [];

for (let i = 0; i < 70; i++) {
  const company = pick(COMPANIES);
  const [role, tech] = pick(ROLES);
  const applied = now - Math.floor(rand() * 175) * DAY - Math.floor(rand() * 10) * 3_600_000;
  const r = rand();
  const flow: Flow = [{ at: applied, status: "applied", subject: `Thank you for applying to ${company}` }];
  let t = applied;
  const step = () => (t += (2 + Math.floor(rand() * 9)) * DAY);
  if (r > 0.45) flow.push({ at: step(), status: "screening", subject: `${company}: let's schedule a quick intro call` });
  if (r > 0.6) flow.push({ at: step(), status: "assessment", subject: `${company} coding assessment invitation` });
  if (r > 0.72) flow.push({ at: step(), status: "interview", subject: `Interview scheduled - ${role}` });
  if (r > 0.93) flow.push({ at: step(), status: "offer", subject: `Offer letter from ${company}` });
  else if (r > 0.3 && rand() > 0.35) flow.push({ at: step(), status: "rejected", subject: `Update on your application to ${company}` });
  const shared = {
    platform: pick(PLATFORMS),
    tech_area: tech,
    employment_model: rand() > 0.15 ? pick(EMPLOYMENT) : null,
    workplace_model: rand() > 0.1 ? pick(WORKPLACE) : null,
    location: rand() > 0.5 ? pick(["Bengaluru", "Remote (India)", "Remote (Worldwide)", "Pune", "Berlin"]) : null,
  };
  for (const f of flow) {
    if (f.at > now) continue;
    emails.push({ company, role, thread: `t${i}`, at: f.at, c: { ...shared, status: f.status }, subject: f.subject });
  }
}

// Edge cases the real sync must handle:
// 1. Same company written differently -> one application.
emails.push({ company: "Acme Technologies Pvt. Ltd.", role: "Frontend Engineer", thread: "acme1", at: now - 20 * DAY, c: { status: "applied", tech_area: "frontend" }, subject: "Application received" });
emails.push({ company: "ACME", role: "Frontend Engineer", thread: "acme2", at: now - 12 * DAY, c: { status: "interview" }, subject: "Interview with Acme" });
// 2. Same company, different role -> two applications.
emails.push({ company: "Acme", role: "DevOps Engineer", thread: "acme3", at: now - 10 * DAY, c: { status: "applied", tech_area: "cloud_devops" }, subject: "Thanks for applying (DevOps)" });

emails.sort((a, b) => a.at - b.at);
for (const e of emails) send(e.company, e.role, e.thread, e.at, e.c, e.subject);

// A non-job email should be recorded but not create an application.
applyEmail(counters, { id: "ffff0001", threadId: "news", from: "jobs@linkedin.com", to: "", subject: "30 new jobs for you", date: new Date().toISOString(), body: "" }, null);

const ghosted = markGhosted(30);
db().prepare("INSERT OR REPLACE INTO kv(key, value) VALUES ('last_sync_at', ?)").run(new Date().toISOString());

const apps = listApplications();
const acme = apps.filter((a) => a.company.toLowerCase().includes("acme"));
console.log(`Seeded ${emails.length} emails -> ${apps.length} applications (${counters.added} created, ${counters.updated} updates, ${ghosted} ghosted).`);
console.log("Acme check:", acme.map((a) => `${a.company} / ${a.role} / ${a.status}`).join(" | "));
if (acme.length !== 2) throw new Error("Expected Acme emails to form exactly 2 applications");
if (!acme.some((a) => a.role === "Frontend Engineer" && a.status === "interview")) throw new Error("Acme frontend should be at interview");
