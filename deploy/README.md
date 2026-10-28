# VPS profile

This profile matches the current production VPS conventions: Nginx, PM2, and an application process bound to localhost. The Lab, Swagger, health, and tool catalog are public. All other API routes require an application-validated `ait_` key in production.

The checked-in Nginx profile also applies per-IP limits to public metadata routes and stricter limits to `/api/`, including invalid-key traffic. If a trusted CDN or load balancer sits in front of Nginx, configure and verify the appropriate real-client-IP module before relying on `$binary_remote_addr` for enforcement.

## First deployment

1. Point `tools.veristrata.ai` to the VPS public IP.
2. Clone the public repository to `/opt/VeriStrata-AI-Tools`.
3. Use Node.js 20 or 22 for this service (`@modelcontextprotocol/server` requires Node 20+).
4. Run `npm ci && npm run build`.
5. Create `/opt/VeriStrata-AI-Tools/.env` with mode `600`, `AI_TOOLS_AUTH_MODE=required`, `AI_TOOLS_DB_*`, and—only when live Partner features are enabled—the `VERISTRATA_API_KEY`. Do not add it to Git.
6. Start the API: `pm2 start deploy/ecosystem.config.cjs && pm2 save`.
7. Copy `deploy/nginx.tools.veristrata.ai.conf` to `/etc/nginx/conf.d/`, run `nginx -t`, then reload Nginx.
8. After DNS resolves, run `certbot --nginx -d tools.veristrata.ai`.

Verify:

```bash
curl -I https://tools.veristrata.ai/
curl -I https://tools.veristrata.ai/swagger/
curl https://tools.veristrata.ai/api/health
```

## Enabling live tools

Run the database migrations and issue one `ait_` key per collaborator or integration. The application validates it, applies quota/rate limits and records usage. Cloudflare Access or OAuth remains recommended as an additional human-access layer; the API key is the programmatic client credential.
