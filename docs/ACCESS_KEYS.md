# AI Tools access keys

AI Tools client credentials and VeriStrata Partner credentials are deliberately separate:

```text
client/model --Bearer ait_...--> AI Tools API --server-held vsk_...--> Partner API
```

An `ait_` key identifies and limits a client of this service. It never grants direct Partner API access and cannot be exchanged for the upstream key.

## Security properties

- Raw keys are shown once at issuance and are never stored.
- MariaDB stores only the SHA-256 key hash and a short display prefix.
- Keys can be revoked or expired independently.
- Keys carry least-privilege scopes: `tools:execute`, `evaluations:run`, `partner:read`, `assessments:read`, and `diagnostics:read`.
- Each key has a requests-per-minute limit and optional monthly quota.
- Billable tool execution has a separate monthly investigation allowance and concurrency limit.
- Privileged requests produce usage records with method, path, status, duration and request ID.
- Production defaults to `AI_TOOLS_AUTH_MODE=required`; missing database configuration fails closed.
- Local development may explicitly use `AI_TOOLS_AUTH_MODE=disabled`. Production ignores that bypass.

## Setup

Set the separate `AI_TOOLS_DB_*` credentials, then apply the idempotent migrations:

```bash
npm run db:migrate
```

Create a client key:

```bash
npm run keys -w @veristrata-ai-tools/tools-lab -- create "ASFAI collaboration preview" \
  --scopes=tools:execute,diagnostics:read \
  --tools=corpus_assess \
  --expires-days=30 --rpm=10 --monthly=100 --investigations=10 --concurrent=1
```

Save the displayed `ait_...` value in an approved secret manager. The command cannot recover it later. Give the raw value only to its intended client.

To issue a narrower evaluation-only key:

```bash
npm run keys -w @veristrata-ai-tools/tools-lab -- create "Evaluation runner" --scopes=evaluations:run
```

Revoke a key using its non-secret key ID:

```bash
npm run keys -w @veristrata-ai-tools/tools-lab -- revoke 00000000-0000-0000-0000-000000000000
```

Clients send:

```http
Authorization: Bearer ait_example
```

## Before enabling production traffic

1. Use a MariaDB account restricted to `veristrata_ai_tools.*`.
2. Set `AI_TOOLS_AUTH_MODE=required` explicitly.
3. Load the Partner `vsk_` key from the VPS secret environment—not Git or Vite.
4. Issue one `ait_` key per organization or integration, not one shared global key.
5. Put TLS and an IP-level rate limit at Nginx/Cloudflare in front of the application limit.
6. Establish rotation, revocation, retention, and incident-response procedures.

This is an initial collaboration layer, not a full customer identity platform. OAuth/OIDC, scoped permissions, organization administration and billing should be added before broad multi-tenant commercialization.
