// Runs the sample emails in ai-test-cases.ts through the local Ollama model and scores the answers.
//
//   npm run test:ai                                         # OLLAMA_MODEL from .env.local
//   npm run test:ai -- --models qwen3.5:9b,gemma4:e4b       # compare Ollama models and rank them
//   npm run test:ai -- --verbose                            # print every answer, not just failures
//   npm run test:ai -- --min 95                             # accuracy (%) needed to exit 0 (default 90)
//
// Each run writes a report per model (score + every failed email) and a ranking to reports/ai-test/.
import path from "node:path";
import { aiModelName, classifyEmail, type EmailClassification } from "../src/lib/classify";
import { testCases, type TestCase } from "./ai-test-cases";
import { pct, rankingTable, secs, writeModelReport, writeSummary, type Result } from "./ai-report";

const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(/\/$/, "");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const verbose = process.argv.includes("--verbose");
const minAccuracy = Number(arg("min") ?? 90);

function check({ expect }: TestCase, c: EmailClassification | null) {
  const job = Boolean(c?.is_application_update) === expect.job;
  const status = !expect.job || !expect.status || c?.status === expect.status;
  const company = !expect.job || !expect.company || expect.company.test(c?.company ?? "");
  return { job, status, company, ok: job && status && company };
}

async function runModel(model: string | undefined): Promise<Result> {
  const name = model ?? aiModelName();
  console.log(`\n=== ${name} (${testCases.length} cases) ===`);

  // The first request loads the model into memory; time it separately from the test cases.
  const loadStart = Date.now();
  try {
    await classifyEmail(testCases[0].email, model);
  } catch (err) {
    console.log(`  warm-up failed: ${err instanceof Error ? err.message : err}`);
  }
  const r: Result = {
    model: name,
    cases: testCases.length,
    passed: 0,
    jobOk: 0,
    statusOk: 0,
    statusTotal: 0,
    companyOk: 0,
    companyTotal: 0,
    errors: 0,
    loadMs: Date.now() - loadStart,
    totalMs: 0,
    failures: [],
  };

  for (const [i, t] of testCases.entries()) {
    const started = Date.now();
    let c: EmailClassification | null = null;
    let error: string | null = null;
    try {
      c = await classifyEmail(t.email, model);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      r.errors++;
    }
    const ms = Date.now() - started;
    r.totalMs += ms;

    const res = check(t, c);
    if (res.ok) r.passed++;
    else r.failures.push({ index: i + 1, testCase: t, got: c, error, ms });
    if (res.job) r.jobOk++;
    if (t.expect.job && t.expect.status) {
      r.statusTotal++;
      if (res.status && res.job) r.statusOk++;
    }
    if (t.expect.job && t.expect.company) {
      r.companyTotal++;
      if (res.company && res.job) r.companyOk++;
    }

    if (!res.ok || verbose) {
      const want = t.expect.job ? `job ${t.expect.status} ${t.expect.company ?? ""}` : "not job";
      console.log(`  ${res.ok ? "PASS" : "FAIL"} ${String(i + 1).padStart(3)}  ${secs(ms).padStart(6)}  "${t.email.subject}"`);
      console.log(
        error
          ? `        error: ${error}`
          : `        want: ${want} | got: job=${Boolean(c?.is_application_update)} status=${c?.status} company=${c?.company}`,
      );
    } else {
      process.stdout.write(i % 50 === 49 ? ".\n" : ".");
    }
  }
  console.log(
    `\n  ${r.passed}/${testCases.length} passed (${pct(r.passed, testCases.length)}), ` +
      `avg ${secs(r.totalMs / testCases.length)}/email, total ${secs(r.totalMs)}`,
  );
  return r;
}

/** Free the model's memory before loading the next one. */
async function unload(model: string) {
  await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    body: JSON.stringify({ model, keep_alive: 0 }),
  }).catch(() => {});
}

function printRanking(results: Result[]) {
  const { header, rows } = rankingTable(results);
  const widths = header.map((h, c) => Math.max(h.length, ...rows.map((row) => row[c].length)));
  const line = (cells: string[]) => cells.map((cell, c) => cell.padEnd(widths[c])).join("  ");
  console.log(`\nRanking (${testCases.length} cases)\n`);
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) console.log(line(row));
}

async function main() {
  const models = arg("models")
    ?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const results: Result[] = [];
  for (const model of models ?? [undefined]) {
    const result = await runModel(model);
    results.push(result);
    if (model) await unload(model);
    // Write as we go, so a long benchmark leaves reports for the models it has finished.
    console.log(`  report: ${path.relative(process.cwd(), writeModelReport(result))}`);
    writeSummary(results);
  }
  printRanking(results);
  console.log(`\nReports: ${path.relative(process.cwd(), path.dirname(writeSummary(results)))}/`);

  const best = Math.max(...results.map((r) => (r.passed / testCases.length) * 100));
  process.exit(best >= minAccuracy ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
