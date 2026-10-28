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

Before deployment, choose the hostname and access-control policy. DNS, TLS, service installation, and reverse-proxy changes are intentionally operator-specific and are not performed by this repository.
