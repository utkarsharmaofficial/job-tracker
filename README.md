# Job Tracker

A local dashboard that reads your Gmail (read-only), finds job application emails, and tracks each application's progress.

- **Overview:** total applications, active pipeline, interviews, offers, response rate, a calendar heatmap of applications per day, weekly/monthly chart, status and platform breakdowns, recent updates.
- **Applications:** Kanban board (drag to change status) or sortable table, filters for tech area (Frontend / Backend / Full Stack / Mobile / Cloud & DevOps), employment model (FTE / Contractor / Freelance / Agency), workplace (On-site / Hybrid / Remote / Digital Nomad), and platform. Each application has an email timeline and editable details.
- **Statuses:** Applied → Screening → Assessment → Interview → Offer, plus Rejected, Withdrawn, and Ghosted (no reply for N days, default 30).

Everything runs on your Mac. Data lives in `data/job-tracker.db` (SQLite). The server only listens on `127.0.0.1`.

For a full walkthrough of the architecture and every flow, see **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**.

## Setup

Requires Node.js 22.5+ (uses the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev                  # http://localhost:3000
```

1. **Local AI model** that reads and sorts your emails, with Ollama: `brew install ollama`, `brew services start ollama`, `ollama pull ministral-3:8b`, then set `AI_PROVIDER=ollama` and `OLLAMA_MODEL=ministral-3:8b` in `.env.local`. Free, and emails never leave your Mac. Check it with `npm run test:ai`. See [Choosing a model](#choosing-a-model) for why this model.
2. **Google OAuth client** (one time, about 5 minutes) at console.cloud.google.com:
   1. Create a project and enable the **Gmail API**.
   2. OAuth consent screen: user type **External**, add your Gmail address under **Test users**, add the scope `.../auth/gmail.readonly`.
   3. Credentials → Create credentials → OAuth client ID → **Web application**. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
   4. Copy the client ID and secret into `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and restart `npm run dev`.
3. Open **Settings → Connect Gmail**. Before connecting, choose how far back the first sync reads: all emails, the last 1 year, 6 months, 3 months or 1 month (the default). Emails older than that start date are never read. Later syncs pick up new mail from where the previous one stopped.

> While the Google app is in "Testing" mode, Google expires the sign-in after 7 days. When sync says access expired, click **Reconnect** in Settings.

## How sync works

1. Gmail is searched for emails from ATS systems and job platforms (Greenhouse, Lever, Workday, Ashby, LinkedIn, Naukri, Wellfound, Instahyre, Cutshort, Turing, Toptal, Upwork, …) and for subjects like "your application", "interview", "assessment", "unfortunately".
2. Each new email is sent to the AI model (local `ministral-3:8b` via Ollama), which returns structured JSON: whether it is an application update, company, role, platform, status, a one-line summary, and tech/employment/workplace tags.
3. Emails are grouped into applications by Gmail thread, then by company name (normalized, so "Acme Technologies Pvt. Ltd." = "Acme") and job title.
4. Status only moves forward (Applied → Screening → …), except for final outcomes (Offer/Rejected/Withdrawn). **If you set a status by hand it is locked** and emails won't change it; unlock it from the application panel.
5. Every email is recorded, so nothing is classified twice. Auto-sync runs every 6 hours while the app is running (configurable in Settings).

Email content never leaves your Mac: the model runs locally. OAuth tokens are stored in the local SQLite file.

If Ollama stops mid-sync, everything processed so far is saved and the rest is picked up on the next sync.

**Local model notes:** `ministral-3:8b` (6.0 GB) fits comfortably in 16 GB of RAM and classifies an email in about 12 seconds on an Apple M-series chip. If it feels slow, `llama3.1:8b` is a little faster and nearly as accurate: run `ollama pull llama3.1:8b` and set `OLLAMA_MODEL=llama3.1:8b`. Ollama must be running for syncs (`brew services start ollama` keeps it running in the background; `brew services stop ollama` turns it off).

## Choosing a model

Five local models were tested on the same 100 sample emails from [scripts/ai-test-cases.ts](scripts/ai-test-cases.ts): confirmations, screens, assessments, interviews, offers and rejections, plus 25 emails that are *not* application updates (job alerts, cold outreach, a prompt-injection attempt). `ministral-3:8b` scored highest and is the model this app uses.

| # | Model | Size | Accuracy | Job or not | Status | Company | Time per email |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **[ministral-3:8b](reports/ai-test/ministral-3-8b.md)** (in use) | 6.0 GB | **99%** | 100% | 98.7% | 100% | 11.8 s |
| 2 | [llama3.1:8b](reports/ai-test/llama3.1-8b.md) | 4.9 GB | 97% | 98% | 98.7% | 100% | 10.1 s |
| 3 | [gemma4:e4b](reports/ai-test/gemma4-e4b.md) | 9.6 GB | 97% | 98% | 97.3% | 98.7% | 10.8 s |
| 4 | [qwen3.5:9b](reports/ai-test/qwen3.5-9b.md) | 6.6 GB | 97% | 99% | 96.0% | 98.7% | 19.7 s |
| 5 | [qwen3.5:4b](reports/ai-test/qwen3.5-4b.md) | 3.4 GB | 96% | 96% | 94.7% | 94.7% | 10.8 s |

*Accuracy* is the share of emails where everything was right. *Job or not* is whether the model correctly told application updates from other email. *Status* and *Company* are measured on the application emails only. Tested on 28 Sept 2026 on an Apple M-series Mac; no model returned an error.

For the full results, including every email each model got wrong with the expected and actual answers, see the **[reports/ai-test](reports/ai-test/README.md)** folder. To test other models yourself:

```bash
npm run test:ai -- --models ministral-3:8b,llama3.1:8b   # compare and rank models
npm run test:ai                                          # just the model in OLLAMA_MODEL
```

## Demo data

Try the UI without connecting Gmail. This uses a separate `data/demo.db` and runs fake emails through the real matching logic:

```bash
npm run demo:seed
npm run demo        # http://localhost:3001
```

## Project layout

```
src/lib/db.ts            SQLite schema and helpers
src/lib/google.ts        Google OAuth + Gmail client
src/lib/gmail.ts         Gmail search queries and email parsing
src/lib/classify.ts      Email classification (local Ollama model, structured output)
src/lib/sync.ts          Sync pipeline
src/lib/applications.ts  Application queries, matching, status rules
src/app/                 Pages (Overview, Applications, Settings) and API routes
src/instrumentation.ts   Background auto-sync timer
scripts/                 Demo seeding and the AI model test (100 sample emails)
reports/ai-test/         Model test results, one report per model
```

## Not built yet

Job suggestions from job platforms (planned for later). The tech/employment/workplace tags on applications are already there for it to reuse.
