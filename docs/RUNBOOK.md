# Local runbook

## Prerequisites

- Node.js 20+
- A Partner API base URL and `vsk_` key for live workflows
- MariaDB only if local assessment persistence is wanted

## Development

1. Copy `.env.example` to `.env` and set `VERISTRATA_BASE_URL` and `VERISTRATA_API_KEY`.
2. Run `npm install`, `npm run build`, and `npm test`.
3. Run `npm run dev`.
4. Open `http://127.0.0.1:5174`; Swagger is at `/swagger/`.

Without a Partner key, the UI, Swagger, tool catalog, diagnostics, and deterministic Evaluation Lab work. Partner-backed execution returns a clear configuration error.

## Optional persistence

Create a MariaDB database and limited user named `veristrata_ai_tools`, set only `AI_TOOLS_DB_*` values, then run `npm run db:migrate`. The migration runner refuses any database name other than `veristrata_ai_tools`. No migration runs during install, build, test, or startup.

## Verification

```bash
npm run build
npm test
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/diagnostics
```

For a Partner smoke test, use the Lab with a non-production key and `wait_seconds: 0`. Confirm the returned topic/job in the existing Partner panel before starting evidence collection.
