# Production deployment

The public production shape should split presentation from privileged execution:

```text
Internet -> TLS reverse proxy -> static Lab + public /swagger
                              -> authenticated/rate-limited /api/tools/*/execute
                              -> authenticated/rate-limited /api/partner/*
                              -> localhost Node process -> Partner API using server-held vsk_ key
```

## Required controls

- Keep `.env` on the VPS, outside Git, readable only by the service account.
- Bind Node to `127.0.0.1`; expose only the TLS reverse proxy.
- Publicly serve `/swagger/`, static assets, `/api/health`, and the tool catalog.
- Require application-validated `ait_` keys for deterministic preflight, live tool execution, Partner reads, recent assessments, and detailed diagnostics. Cloudflare Access or OAuth can add a human-access layer.
- Retain and tune the checked-in per-IP Nginx limits and request-size limits. When a trusted proxy sits in front of Nginx, verify real-client-IP handling before relying on IP enforcement.
- Never expose `VERISTRATA_API_KEY` in Vite variables, browser runtime config, logs, or GitHub Actions.
- Use a separate least-privilege MariaDB user restricted to `veristrata_ai_tools.*`.

## Build and service

```bash
npm ci
npm run build
TOOLS_LAB_PORT=8787 node --import tsx apps/tools-lab/server/index.ts
```

For a durable service, use systemd or an existing process manager with `Restart=on-failure`, a dedicated Unix user, and an environment file outside the checkout. Serve `apps/tools-lab/dist/client` as static files and proxy `/swagger` and `/api` to `127.0.0.1:8787`.

The checked-in `deploy/` profile targets the current Nginx/PM2 VPS layout at `tools.veristrata.ai` on localhost port `8791`. Production authentication fails closed: only Swagger, health and the catalog are anonymous; privileged APIs require an active `ait_` key and configured access-key database.
