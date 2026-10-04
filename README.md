# Shortlist Workbench

Internal tool for staffing applications: work through one job's applicants, change a status, and ask an LLM for a second opinion on the match score — on demand, never in bulk.

## Run it

Node 20+, Docker, npm.

```bash
cp .env.example .env
npm install
docker compose up -d --wait
npm run db:reset
npm run dev
```

- UI http://localhost:5173
- API http://localhost:4000
- Postgres on `localhost:5433` (`shortlist`/`shortlist`/`shortlist`)
- `npm run db:reset` drops the schema, recreates it, and loads `server/csv_data/*.csv` (40 jobs, 400 candidates, 900 applications). It is the one repeatable load from an empty database, and it wipes recruiter notes and cached LLM scores.

## Layout

```
web (React + Vite)  →  Express API  →  PostgreSQL
                              ↘ MatchScorer (mock | live)
```

`server/src/modules/*` holds one folder per feature, layered so each one only knows the layer below:

| Layer         | Responsibility                        | Knows about          |
| ------------- | ------------------------------------- | -------------------- |
| `.routes`     | URL, HTTP method, middleware wiring   | Express              |
| `.handler`    | HTTP in, HTTP out                     | Express, service     |
| `.schema`     | request shape and query-string values | HTTP, feature types  |
| `.service`    | business rules, typed errors          | domain, repositories |
| `.repository` | SQL, row mapping, `WHERE` building    | PostgreSQL           |

`server/src/app.ts` wires pool → repositories → services → handlers → routers and is the only place that knows the whole graph. Services never see `req`/`res`, so they are callable from a CLI or a job. Around the modules: `errors.ts` (typed errors; `http/error-handler.ts` is the only place that turns one into a status), `http/list-query.ts` (query-string parsing, allowlisted sort keys, paging), `db/` (pool, migrations, CSV seed), `types.ts` (shared domain vocabulary). `server/src/modules/llm/` is described below; the UI mirrors it in `web/src/domain.ts` (types) and `web/src/api.ts` (transport).

Filtering, sorting and paging happen in SQL — one `COUNT` plus one `LIMIT/OFFSET` page, never in the browser.

## The second score

`POST /applications/{id}/llm-score` builds a short prompt from the job (family, seniority, location) and the candidate (preferred family, years of experience, location), asks for **structured JSON** via `response_format: json_schema`, and stores `{ score 0–100, reason, model, scored_at }` on the application.

- **Model: OpenRouter `openrouter/auto`.** The assignment says a small cheap model and no real money; `auto` usually routes to a currently free model served by OpenRouter partners, so the demo should costs nothing and survives a model being retired. The routed model name is stored with each score, so a result is traceable to what produced it.
- **Interface + flag.** `LLM_MODE=mock` (default) returns a deterministic stub — the score is a hash of `job_id` + `candidate_id`, so the same pair always gives the same number and a demo is reproducible with no api key. `LLM_MODE=live` with `OPENROUTER_API_KEY` calls the model. The key is read in `config.ts` on the server and never shipped to the browser.
- **Cache.** The LLM / mock score is written to the database and reused;

## UI notes

- The recruiter lands on the job list (`/`), selects job, opens it and works through thecandidate list at `/job/:jobId`.
- Filters live in left sidebar panel.
- Candidate details is a right sidebar panel, opens when user clicks on a candidate. A status change is applied optimistically and rolled back on failure.
- Filters, sort, paging and the open application live in the URL, so a view can be reloaded or shared.
- Repeat applications are kept, never merged. `sibling_application_ids` carries the same candidate's other applications to that job (newest first), resolved in SQL and not narrowed by active filters, so the "also applied as" link still works from any page.

## Tests

`npm test` — 34 tests over a real Postgres.

Covers: list filtering (single and combined), sorting, pagination, per-job scoping, query validation errors (`400` codes), detail joins and `404`s, the status update including note preservation, the LLM score cache (called once), its `502` path, the response validator, and the determinism and range of the mock score. `GET /jobs` filters, search, sort and counts are covered too.

## Assumptions

- The UI only exposes the candidate-side filters plus the application-side ones because the list is scoped to one job.
- `status` and `matchBand` are closed sets with CHECK constraints, so an unknown value is a `400`. `source` is free text.
- No `UNIQUE (job_id, candidate_id)`: the CSV contains real repeat pairs, and they are all kept.

## Left out, and next

Left out: tests for frontend code, keyboard shortcuts, free-text search over candidate name (job search covers title and city only), dedicated summary endpoint and selection of several candidates on a page for mass actions.
