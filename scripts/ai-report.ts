// Markdown reports for `npm run test:ai`: one file per model with its score and every failed
// email, plus a ranking of all models run so far. Written to reports/ai-test/.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EmailClassification } from "../src/lib/classify";
import type { TestCase } from "./ai-test-cases";

export const REPORT_DIR = path.join(process.cwd(), "reports", "ai-test");

export type Failure = {
  index: number;
  testCase: TestCase;
  got: EmailClassification | null;
  error: string | null;
  ms: number;
};

export type Result = {
  model: string;
  cases: number;
  passed: number;
  jobOk: number;
  statusOk: number;
  statusTotal: number;
  companyOk: number;
  companyTotal: number;
  errors: number;
  loadMs: number;
  totalMs: number;
  failures: Failure[];
};

export const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "-");
export const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** Best accuracy first; ties go to the faster model. */
export function rankingTable(results: Result[]): { header: string[]; rows: string[][]; ranked: Result[] } {
  const ranked = [...results].sort((a, b) => b.passed / b.cases - a.passed / a.cases || a.totalMs - b.totalMs);
  const header = ["#", "Model", "Accuracy", "Job?", "Status", "Company", "Errors", "Avg/email", "Total", "Load"];
  const rows = ranked.map((r, i) => [
    String(i + 1),
    r.model,
    pct(r.passed, r.cases),
    pct(r.jobOk, r.cases),
    pct(r.statusOk, r.statusTotal),
    pct(r.companyOk, r.companyTotal),
    String(r.errors),
    secs(r.totalMs / r.cases),
    secs(r.totalMs),
    secs(r.loadMs),
  ]);
  return { header, rows, ranked };
}

const fileName = (model: string) => `${model.replace(/[^a-zA-Z0-9.-]+/g, "-")}.md`;
const mdRow = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "_null_" : `\`${String(v)}\``);
const now = () => new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function failureSection(f: Failure, n: number): string {
  const { email, expect } = f.testCase;
  const lines = [`### ${n}. Case #${f.index} – "${email.subject}"`, ""];

  if (f.error) {
    lines.push(`**Error:** ${f.error}`, "");
  } else {
    const got = f.got;
    const isJob = Boolean(got?.is_application_update);
    const jobWrong = isJob !== expect.job;
    const statusWrong = expect.job && expect.status !== undefined && got?.status !== expect.status;
    const companyWrong = expect.job && expect.company !== undefined && !expect.company.test(got?.company ?? "");
    const mark = (wrong: boolean, v: string) => (wrong ? `❌ ${v}` : v);
    lines.push(
      "| Field | Expected | Got |",
      "|---|---|---|",
      mdRow(["Application update", show(expect.job), mark(jobWrong, show(isJob))]),
      mdRow(["Status", expect.job ? show(expect.status) : "_not checked_", mark(statusWrong, show(got?.status))]),
      mdRow(["Company", expect.job ? `matches \`${expect.company}\`` : "_not checked_", mark(companyWrong, show(got?.company))]),
      "",
      "Other fields the model returned: " +
        [
          `role ${show(got?.role)}`,
          `platform ${show(got?.platform)}`,
          `tech ${show(got?.tech_area)}`,
          `employment ${show(got?.employment_model)}`,
          `workplace ${show(got?.workplace_model)}`,
          `location ${show(got?.location)}`,
        ].join(", "),
      "",
      `Model's summary: ${got?.summary ? `_${got.summary}_` : "_none_"}`,
      "",
    );
  }

  lines.push(
    `Time: ${secs(f.ms)}`,
    "",
    "**Email**",
    "",
    "````text",
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    "",
    email.body,
    "````",
    "",
  );
  return lines.join("\n");
}

/** reports/ai-test/<model>.md: score, timing and every failed case with the full email. */
export function writeModelReport(r: Result): string {
  const lines = [
    `# AI test report: ${r.model}`,
    "",
    `Run on ${now()}, ${r.cases} test cases from [scripts/ai-test-cases.ts](../../scripts/ai-test-cases.ts).`,
    "",
    "A case passes when the model gets *is this an application update* right and, for application emails, both the status and the company.",
    "",
    "| Score | Job? | Status | Company | Errors | Avg per email | Total time | Model load |",
    "|---|---|---|---|---|---|---|---|",
    mdRow([
      `**${r.passed}/${r.cases} (${pct(r.passed, r.cases)})**`,
      pct(r.jobOk, r.cases),
      pct(r.statusOk, r.statusTotal),
      pct(r.companyOk, r.companyTotal),
      String(r.errors),
      secs(r.totalMs / r.cases),
      secs(r.totalMs),
      secs(r.loadMs),
    ]),
    "",
    `## Failed cases (${r.failures.length})`,
    "",
  ];
  if (!r.failures.length) lines.push("None. Every case passed.", "");
  r.failures.forEach((f, i) => lines.push(failureSection(f, i + 1)));

  mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, fileName(r.model));
  writeFileSync(file, lines.join("\n"));
  return file;
}

/** reports/ai-test/README.md: ranking of every model in this run, linking to their reports. */
export function writeSummary(results: Result[]): string {
  const { header, rows, ranked } = rankingTable(results);
  const lines = [
    "# AI model comparison",
    "",
    `Run on ${now()}, ${results[0]?.cases ?? 0} test cases. Ranked by accuracy, then speed. Times are per email on this Mac; *Load* is the first request, which loads the model into memory.`,
    "",
    mdRow(header),
    mdRow(header.map(() => "---")),
    ...rows.map((row, i) => mdRow(row.map((c, col) => (col === 1 ? `[${c}](${fileName(ranked[i].model)})` : c)))),
    "",
    "Columns: *Accuracy* = cases fully correct. *Job?* = application vs. not correctly detected. *Status* and *Company* = correct among application emails.",
    "",
  ];
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, "README.md");
  writeFileSync(file, lines.join("\n"));
  return file;
}
