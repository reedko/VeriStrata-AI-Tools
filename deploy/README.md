# VPS profile

This profile matches the current production VPS conventions: Nginx, PM2, and an application process bound to localhost. It deliberately makes the Lab, Swagger, health, tool catalog, and deterministic corpus preflight public while returning `403` for Partner-backed execution and reads.

## First deployment

1. Point `ai-tools.veristrata.ai` to the VPS public IP.
2. Clone the public repository to `/opt/VeriStrata-AI-Tools`.
3. Use Node.js 20 or 22 for this service (`@modelcontextprotocol/server` requires Node 20+).
4. Run `npm ci && npm run build`.
5. If live Partner features will later be enabled, create `/opt/VeriStrata-AI-Tools/.env` with mode `600`; do not add it to Git.
6. Start the API: `pm2 start deploy/ecosystem.config.cjs && pm2 save`.
7. Copy `deploy/nginx.ai-tools.veristrata.ai.conf` to `/etc/nginx/conf.d/`, run `nginx -t`, then reload Nginx.
8. After DNS resolves, run `certbot --nginx -d ai-tools.veristrata.ai`.

Verify:

```bash
curl -I https://ai-tools.veristrata.ai/
curl -I https://ai-tools.veristrata.ai/swagger/
curl https://ai-tools.veristrata.ai/api/health
```

## Enabling live tools later

Add Cloudflare Access, OAuth, or another identity-aware proxy in front of the privileged Nginx locations. Only then replace the `403` rules with authenticated proxying to port 8791 and provide the Partner key through the server environment. Basic auth is acceptable for a short private collaboration preview but should not be the long-term public model.
