import "server-only";
import type { gmail_v1 } from "@googleapis/gmail";
import { convert } from "html-to-text";

// Senders that almost always mean a job application update (ATS systems and job platforms).
const JOB_SENDER_DOMAINS = [
  "greenhouse.io", "greenhouse-mail.io", "lever.co", "hire.lever.co", "myworkday.com", "myworkdayjobs.com",
  "ashbyhq.com", "smartrecruiters.com", "workable.com", "workablemail.com", "icims.com", "jobvite.com",
  "breezy.hr", "recruitee.com", "bamboohr.com", "teamtailor.com", "personio.de", "rippling.com",
  "successfactors.com", "taleo.net", "oraclecloud.com", "freshteam.com", "zohorecruit.com", "keka.com",
  "darwinbox.in", "hackerrank.com", "hackerearth.com", "codility.com", "testgorilla.com", "karat.io",
  "linkedin.com", "naukri.com", "instahyre.com", "cutshort.io", "wellfound.com", "angel.co",
  "turing.com", "toptal.com", "flexiple.com", "upwork.com", "freelancer.com", "guru.com",
  "peopleperhour.com", "glassdoor.com", "ziprecruiter.com", "indeed.com", "indeedemail.com",
  "welcometothejungle.com", "himalayas.app", "workatastartup.com", "ycombinator.com", "hiring.cafe",
  "techgig.com", "iimjobs.com", "hirist.tech", "foundit.in", "otta.com",
];

const JOB_PHRASES = [
  '"your application"', '"thank you for applying"', '"thanks for applying"', '"application received"',
  '"application for"', '"applied for"', '"interview"', '"next steps"', '"coding challenge"',
  '"assessment"', '"take-home"', '"offer letter"', '"unfortunately"', '"not moving forward"',
  '"move forward"', '"your candidacy"', '"regret to inform"', '"position"', '"recruiter"', '"shortlisted"',
];

/** Several smaller queries (results are merged) to stay well under Gmail's query length limits. */
export function buildSearchQueries(afterDate: Date): string[] {
  // Gmail accepts a Unix timestamp here, which is exact (a date would round to a whole day).
  const after = Math.floor(afterDate.getTime() / 1000);
  // Skip what the user sent themselves, chat, and obvious newsletters. A start of 0 ("All emails")
  // leaves out the date filter.
  const base = `${after > 0 ? `after:${after} ` : ""}-in:sent -in:chats -category:promotions`;
  const queries: string[] = [];
  for (let i = 0; i < JOB_SENDER_DOMAINS.length; i += 20) {
    const from = JOB_SENDER_DOMAINS.slice(i, i + 20).join(" OR ");
    queries.push(`${base} from:(${from})`);
  }
  queries.push(`${base} subject:(${JOB_PHRASES.join(" OR ")})`);
  return queries;
}

export async function listMessageIds(gmail: gmail_v1.Gmail, query: string): Promise<{ id: string; threadId: string }[]> {
  const out: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 500, pageToken });
    for (const m of res.data.messages ?? []) {
      if (m.id && m.threadId) out.push({ id: m.id, threadId: m.threadId });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export type ParsedEmail = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string; // ISO
  body: string;
};

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decode(data: string | null | undefined): string {
  return data ? Buffer.from(data, "base64url").toString("utf8") : "";
}

function collectParts(part: gmail_v1.Schema$MessagePart | undefined, plain: string[], html: string[]) {
  if (!part) return;
  if (part.mimeType === "text/plain" && part.body?.data) plain.push(decode(part.body.data));
  else if (part.mimeType === "text/html" && part.body?.data) html.push(decode(part.body.data));
  for (const p of part.parts ?? []) collectParts(p, plain, html);
}

export async function fetchEmail(gmail: gmail_v1.Gmail, id: string): Promise<ParsedEmail> {
  const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const msg = res.data;
  const headers = msg.payload?.headers ?? undefined;
  const plain: string[] = [];
  const html: string[] = [];
  collectParts(msg.payload ?? undefined, plain, html);

  let body = plain.join("\n").trim();
  if (!body && html.length) {
    body = convert(html.join("\n"), {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    });
  }
  if (!body) body = msg.snippet ?? "";

  return {
    id,
    threadId: msg.threadId ?? id,
    from: header(headers, "From"),
    to: header(headers, "To"),
    subject: header(headers, "Subject"),
    date: new Date(Number(msg.internalDate ?? Date.now())).toISOString(),
    body: body.replace(/\n{3,}/g, "\n\n"),
  };
}
