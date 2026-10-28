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
- Publicly serve `/swagger/`, static assets, `/api/health`, and optionally the deterministic preflight endpoint.
- Protect live tool execution, Partner reads, recent assessments, and detailed diagnostics with Cloudflare Access, OAuth, or reverse-proxy basic auth. Do not rely on an unguessable URL.
- Add per-IP/user rate limits and retain request-size limits.
- Never expose `VERISTRATA_API_KEY` in Vite variables, browser runtime config, logs, or GitHub Actions.
- Use a separate least-privilege MariaDB user restricted to `veristrata_ai_tools.*`.

## Build and service

```bash
npm ci
npm run build
TOOLS_LAB_PORT=8787 node --import tsx apps/tools-lab/server/index.ts
```

For a durable service, use systemd or an existing process manager with `Restart=on-failure`, a dedicated Unix user, and an environment file outside the checkout. Serve `apps/tools-lab/dist/client` as static files and proxy `/swagger` and `/api` to `127.0.0.1:8787`.

The checked-in `deploy/` profile targets the current Nginx/PM2 VPS layout at `ai-tools.veristrata.ai` on localhost port `8791`. It defaults to a public read-only preview: Swagger and deterministic evaluation are available, while Partner-backed reads/execution return `403` until collaborator authentication is configured.
