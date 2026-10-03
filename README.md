# Shortlist Workbench

Internal recruiter tool for staffing applications in Germany and Austria: pick an open job, work through the candidates who applied to it, change a status, and request a second match score from an LLM on demand.

## How to run from a clean checkout

You need **Node.js 20+**, **Docker**, and npm.

```bash
cp .env.example .env
npm install
docker compose up -d --wait
npm run db:reset
npm run dev
```

- API: http://localhost:4000
- UI: http://localhost:5173
- Postgres: localhost:5433 (user/password/db `shortlist`)

`db:reset` drops the schema, recreates it, and loads `csv_data/*.csv` (40 jobs, 400 candidates, 900 applications). Run it whenever you want a clean database. Recruiter notes and LLM scores are wiped on reset.

The Vite dev server proxies `/applications` and `/jobs` to the API, so the browser never talks to Postgres or holds an API key.

## How the pieces fit

```
web (React + Vite)  →  Express API  →  PostgreSQL
                              ↘ MatchScorer (mock | Anthropic Haiku)
```

The API is layered, one folder per feature under `server/src/modules`:

```
Route  →  Handler  →  Service  →  Repository  →  PostgreSQL
```

| Layer         | Responsibility                        | Knows about          |
| ------------- | ------------------------------------- | -------------------- |
| `.routes`     | URL + HTTP method + middleware wiring | Express              |
| `.handler`    | HTTP input/output                     | Express, service     |
| `.schema`     | validates the shape of the request    | HTTP, feature types  |
| `.service`    | business / use-case logic             | domain, repositories |
| `.repository` | SQL and row mapping                   | PostgreSQL           |

The tests hit a real database through `createApp`, so nothing below the HTTP layer knows that `req` and `res` exist. A service method could be called from a CLI or a background job unchanged.

Around those modules:

- **`server/src/app.ts`** — wires the layers together bottom up: pool → repositories → services → handlers → routers. `createApp(pool, scorer)` takes both as arguments, which is how the tests point the whole app at their own database.
- **`server/src/errors.ts`** — `BadRequestError`, `NotFoundError`, `BadGatewayError`. Services raise them; `error-handler` is the only place that turns one into a status code.
- **`server/src/http`** — request concerns shared by every route: query-string parsing and validation, async error forwarding, and the single error → response mapping.
- **`server/src/db`** — connection pool, migrations in `db/migrations/*.sql`, CSV seed in `db/seed`, and `filter-builder.ts`: the one place a list query turns into `WHERE` predicates plus their bound values.
- **`server/src/llm.ts`** — the `MatchScorer` mock and Anthropic implementations, plus the one validator for a model score.
- **`server/src/types.ts`** — the domain vocabulary (`Status`, `Job`, `Candidate`, `Application`) the layers share.
- **`web/src/domain.ts`** — types and vocabulary (`Status`, `Job`, `Application`) shared by the UI.
- **`web/src/api.ts`** — transport only.
- **`web/src/applicationFilters.ts`, `web/src/jobFilters.ts`** — what each list page can filter on. One definition per filter (label, URL parameter, options), which is what lets `FilterBar` render them and both pages build their URL state without a second list to keep in sync.
- **`web/src/components/ui/FilterBar`** — the collapsible filter block, shared by both list pages.
- **`web/src/pages`, `web/src/components`** — UI.

### Behaviour worth knowing

- **The recruiter lands on the job list** (`/`), not on a flat application list. Each row shows the job plus how many applicants it has, broken down by status. Picking a job opens its candidates.
- **The candidate list is always scoped to one job** (`/job/:jobId`). The job title, location, family, and seniority head the page; a "← All jobs" link goes back.
- **Filters, sort, and pagination run in SQL**, not in the browser. The job list filters on country, job family, and a title/city search. The candidate list filters on application status, source, match band, and — for the candidate — country, city, years of experience, and preferred job family. Both reset to page 1 when a filter changes, so you never land on an out-of-range page.
- **Filters are checkbox groups behind a "Filters" button.** Ticks inside one group are combined with `IN`, groups with `AND`, and unticking everything means "all" — there is no separate All option to keep in sync with the data. The block is a normal in-flow section rather than an overlay, so opening it pushes the list down instead of covering it; sort stays visible outside the toggle because it is a control you reach for constantly. The button carries a count of active ticks.
- **Years of experience is a set of thresholds, not disjoint ranges.** Ticking "6–9 years" sends `minExperience=6`, which the API compares with `>=`. Ticking several buckets therefore keeps candidates with _at least_ the lowest one ticked, so ticking "0–2 years" together with anything else removes the filter.
- Default candidate sort is match score high → low.
- **Every application is kept, even when the same candidate applies to the same job twice.** Nothing is deduplicated or hidden. Each application carries `sibling_application_ids` — that candidate's _other_ applications to that same job, newest first. It is empty for a single application, and the row then shows nothing extra. When it is not empty the row grows a "2 applications" badge plus an **also applied as** link to each sibling, so the recruiter can jump straight across instead of hunting for a matching name. The siblings are resolved in SQL and deliberately **not** narrowed by the active filters, so the link still works while you filter by status or sit on another page.
- Detail is a **side panel**. Changing status updates the selected row without losing list position (optimistic update, rollback on failure). The panel shows when the status last changed, so a recruiter can see how stale a decision is.
- Routes, filters, and pagination live in the URL, so a job's candidate list can be reloaded or shared.
- `POST /applications/:id/llm-score` scores **on demand**. The result is stored on the application. Opening the same application again, or posting again, does **not** call the model a second time.
- `LLM_MODE=mock` (default) uses a deterministic stub. Set `LLM_MODE=live` and `ANTHROPIC_API_KEY` to call **Claude Haiku 4.5** (`claude-haiku-4-5`): cheap enough for a handful of scores. Structured output is forced with a JSON tool schema (`score` 0–100 + `reason`), then validated again in our code. The key stays on the server.

If a live call fails or returns invalid JSON, the API responds `502` with `{ "error": "llm_unavailable" }`. The UI still shows the application and says the LLM score is unavailable — it never invents a number.

## API

| Method | Path                          | Notes                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/jobs`                       | Query: `country`, `jobFamily`, `search` (title or city), `sort` (`created_at` \| `title` \| `application_count`), `order`, `page`, `pageSize`                                                                                                                                                                                                           |
| GET    | `/jobs/:id`                   | Job + applicant counts by status                                                                                                                                                                                                                                                                                                                        |
| GET    | `/applications`               | Query: `jobId`, `source`, `matchBand`, `candidateCountry`, `candidateCity`, `preferredJobFamily`, `minExperience`, `status`, `country`, `jobFamily`, `sort` (`match_score` \| `created_at` \| `score_disagreement`), `order`, `page`, `pageSize`. Every filter except `minExperience` takes a repeated parameter: `?status=new&status=hired` means both |
| GET    | `/applications/:id`           | Application + candidate + job                                                                                                                                                                                                                                                                                                                           |
| PATCH  | `/applications/:id`           | `{ "status": "shortlisted", "note": "optional" }` — `status` is required, `note` is not                                                                                                                                                                                                                                                                 |
| POST   | `/applications/:id/llm-score` | Cached after first success                                                                                                                                                                                                                                                                                                                              |

The list and detail endpoints return the **same** application shape, so the UI has one type to render. Filtering, sorting, and paging all happen in SQL.

Every application object — list, detail, PATCH, and LLM score alike — carries `sibling_application_ids`: the ids of that candidate's other applications to the same job, newest first, excluding the row itself. It is `[]` when they applied once. `total` stays a count of applications, because duplicates are preserved rather than collapsed.

`score_disagreement` only includes applications that already have an LLM score, ordered by `abs(llm_score - match_score * 100)`.

## Tests

```bash
npm test
```

Needs Compose Postgres up (uses database `shortlist_test` on port 5433). Covers list filtering (single and multi-value, across groups, and the candidate-side filters), sorting, pagination and per-job scoping; parameter validation; status updates (including note preservation); repeat applications and their sibling links across filters; the LLM cache, its invalid-payload guard and the disagreement sort; and the jobs list with its counts.

## Assumptions

- List `country` / `jobFamily` on `/applications` refer to the **job**; `candidateCountry` / `candidateCity` / `preferredJobFamily` / `minExperience` refer to the **candidate**. The candidate list is scoped to one job, so the UI only exposes the candidate-side filters plus the application-side ones; the job-side pair is still available to any other API client.
- `status` and `matchBand` are closed sets (they have CHECK constraints), so an unknown value is a `400`. `source` is free text, because the values are whatever the CSVs and the recruiter's own imports contain.
- A candidate may hold several applications to the same job. The schema has no `UNIQUE (job_id, candidate_id)`, and `csv_data/applications.csv` really does contain such pairs, so this is a live case rather than a hypothetical. All of them are stored and listed; the UI links the repeats together instead of collapsing them.
- `sibling_application_ids` is scoped per job: a candidate with three applications to three _different_ jobs has no siblings on any of them.
- `application_count` on a job row counts applications, so a job with a repeat applicant reports more applications than distinct people.
- Any status change (including back to `new`) sets `status_updated_at`.
- A PATCH without `status` is a `400`, even if it only wants to set a note.
- Seed is wipe-and-reload, not incremental.
- The web route for one job is `/job/:jobId` (singular). `/jobs` is the API prefix the dev proxy forwards, so a `/jobs/...` page path returns JSON instead of the app.
- `LLM_MODE` is validated at boot; a typo fails fast instead of silently using the mock.

## Deliberately left out

Auth, deployment, mobile layout, keyboard shortcuts, and Dockerizing the Node processes. Search covers job title and city only — not candidate name — and there is no dedicated summary endpoint; per-status counts ride along on each job row instead.

## Next with more time

Free-text search over candidate name, inline status change from the list (so a recruiter can triage without opening the panel), and keyboard-driven status changes. Live LLM scoring could stream a reason while the rule-based score stays visible.
