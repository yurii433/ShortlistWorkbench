# Shortlist Workbench

Internal recruiter tool for staffing applications in Germany and Austria: filter a worklist, open one application, change its status, and request a second match score from an LLM on demand.

## How to run from a clean checkout

You need **Node.js 20+**, **Docker**, and npm.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:reset
npm run dev
```

- API: http://localhost:4000
- UI: http://localhost:5173
- Postgres: localhost:5433 (user/password/db `shortlist`)

`db:reset` drops the schema, recreates it, and loads `Task/data/*.csv` (40 jobs, 400 candidates, 900 applications). Run it whenever you want a clean database. Recruiter notes and LLM scores are wiped on reset.

The Vite dev server proxies `/applications` to the API, so the browser never talks to Postgres or holds an API key.

## How the pieces fit

```
web (React + Vite)  →  Express API  →  PostgreSQL
                              ↘ MatchScorer (mock | Anthropic Haiku)
```

- **Filters, sort, and pagination run in SQL**, not in the browser. Country and job family filter the **job**.
- Default list sort is match score high → low.
- Detail is a **side panel**. Changing status updates the selected row without losing list position (optimistic update, rollback on failure).
- Filters, sort, page, and selected `id` live in the URL so a view can be reloaded or shared.
- `POST /applications/:id/llm-score` scores **on demand**. The result is stored on the application. Opening the same application again, or posting again, does **not** call the model a second time.
- `LLM_MODE=mock` (default) uses a deterministic stub. Set `LLM_MODE=live` and `ANTHROPIC_API_KEY` to call **Claude Haiku 4.5** (`claude-haiku-4-5`): cheap enough for a handful of scores. Structured output is forced with a JSON tool schema (`score` 0–100 + `reason`), then validated again in our code. The key stays on the server.

If a live call fails or returns invalid JSON, the API responds `502` with `{ "error": "llm_unavailable" }`. The UI still shows the application and says the LLM score is unavailable — it never invents a number.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/applications` | Query: `status`, `country`, `jobFamily`, `sort` (`match_score` \| `created_at` \| `score_disagreement`), `order`, `page`, `pageSize` |
| GET | `/applications/:id` | Application + candidate + job |
| PATCH | `/applications/:id` | `{ "status": "shortlisted", "note": "optional" }` |
| POST | `/applications/:id/llm-score` | Cached after first success |

`score_disagreement` only includes applications that already have an LLM score, ordered by `abs(llm_score - match_score * 100)`.

## Tests

```bash
npm test
```

Needs Compose Postgres up (uses database `shortlist_test` on port 5433). Covers list filtering/pagination, status updates, LLM cache, and invalid LLM payloads.

## Assumptions

- List `country` / `jobFamily` refer to the job, not the candidate.
- Any status change (including back to `new`) sets `status_updated_at`.
- Seed is wipe-and-reload, not incremental.

## Deliberately left out

Auth, deployment, mobile layout, free-text search, counts-per-status, keyboard shortcuts, Dockerizing the Node processes.

## Next with more time

A summary endpoint, inline status change from the list, and a small “where scores disagree” dashboard. Live LLM could stream a reason while the rule-based score stays visible.
