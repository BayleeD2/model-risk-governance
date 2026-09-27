# Model Risk Governance

A simple web tool for keeping track of machine learning models and the risks they carry.

You record each model once. The tool then helps you score its risk, check it against common governance frameworks, watch for drift, draft validation notes, and keep a record of every change.

> **Not legal or regulatory advice.** Everything this tool produces is analytical output. You remain responsible for your own compliance decisions.

---

## What it does

| Feature | What you get |
|---|---|
| **Model registry** | One list of every model: what it does, who owns it, where it runs, when it was last validated. Add models one at a time or import a CSV. |
| **Risk score** | A score from 0 to 100 and a tier (low, medium, high, critical), with the reasons behind it. The score is suggested by an AI model from the details you entered, so review it before relying on it. |
| **Framework gap check** | Compares a model's details against four frameworks and marks each requirement as met, partial or missing: US SR 11-7, UK PRA SS1/23, the EU AI Act and the NIST AI Risk Management Framework. |
| **Drift monitoring** | Paste baseline and current values to calculate PSI, KS and CSI. These statistics are worked out in code, not by AI. When a result crosses its threshold, the model is flagged and your team gets an email. |
| **Validation notes** | Drafts four sections (model overview, conceptual soundness, data governance, performance and validation) from the details you entered. Any missing fact is marked `[EVIDENCE REQUIRED]` rather than made up. Export to PDF. |
| **Audit trail** | Every change to a model is logged and cannot be edited or deleted. |
| **Teams** | Each organisation sees only its own data, enforced in the database with row-level security. |

### How the AI is kept honest
- AI only drafts text and suggests scores. It never calculates drift statistics.
- Any number in drafted text that is not in the model's record is removed and replaced with `[EVIDENCE REQUIRED]`.
- Wording that sounds like a legal opinion ("complies with", "approved by") is filtered out.
- A test suite (`npm run eval`) checks drafted text for invented figures.

---

## How it is built

| Part | Technology |
|---|---|
| Web app | Next.js, React, TypeScript, Tailwind CSS |
| Database and sign-in | Supabase (Postgres, Auth, row-level security) |
| AI drafting and scoring | Anthropic Claude API (server-side only) |
| Drift statistics | Small Python service (FastAPI, NumPy, SciPy) in `analytics-service/` |
| PDF export | Puppeteer |
| Email alerts (optional) | Resend |

---

## Run it on your computer

**You need:** Node.js 20+, Python 3.11+, the [Supabase CLI](https://supabase.com/docs/guides/local-development) with Docker, and an [Anthropic API key](https://console.anthropic.com/).

**1. Install**
```bash
git clone <this-repo-url>
cd model-risk-governance
npm install
```

**2. Start the database**
```bash
supabase start      # starts a local Supabase and applies everything in supabase/migrations
```
It prints a local URL, an anon key and a service role key. You need them in the next step.

**3. Add your settings**
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in the values. Each one is explained in the file.

**4. Start the drift service** (in a second terminal)
```bash
cd analytics-service
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**5. Start the app**
```bash
npm run dev
```
Open http://localhost:3000, create an account, name your organisation, and add your first model. To try it with example data, import `demo/model-inventory-sample.csv` from the **Import** page.

---

## Tests

```bash
npm test               # app tests
npm run eval           # checks that invented figures are caught in drafted text
cd analytics-service && pytest   # drift statistics tests
```

---

## Scheduled drift checks

`/api/v1/jobs` re-runs drift checks for every model. `vercel.json` schedules it nightly when deployed on Vercel. The endpoint only runs when the request carries `Authorization: Bearer <CRON_SECRET>`. If `CRON_SECRET` is not set, it refuses every request.

---

## Project layout

```
app/                 pages and server actions
  (dashboard)/models/  registry, model detail, risk, gaps, drift, documents, audit
  api/v1/            JSON API for models, scores, gaps, metrics, documents, audit
components/          UI components
lib/ai/              AI prompts, scoring, gap analysis, drafting, grounding checks
lib/db/              database access
lib/regulatoryData/  framework checklists (SR 11-7, SS1/23, EU AI Act, NIST AI RMF)
analytics-service/   Python drift statistics service
supabase/migrations/ database schema and row-level security
demo/                sample model inventory CSV
evals/               tests for AI output
```

---

## Limits

- The framework checklists are simplified summaries, not the full regulatory text.
- Risk scores and drafted text come from an AI model and can be wrong. A person should always review them.
- This is a small, simple tool, not a replacement for a full model risk management system.

## Licence

MIT. See [LICENSE](LICENSE).
