# ASFAI demo readiness

## Verified before production activation

- React Tools Lab builds and displays a prominent `ait_` key entry bar.
- AI Tools Swagger and the underlying Partner Swagger are served separately.
- Existing production Partner credential returns HTTP 200 without exposing its value.
- Ephemeral MariaDB acceptance passes issuance, persistence across restart, expiration, revocation, scopes, per-minute rate limit, monthly investigation quota, usage audit, and two-client isolation.
- Hosted inputs are text-only: no arbitrary URL fetching or internal content IDs.
- Tool inputs are capped at 5,000 characters per text, three narrative texts, five corpus documents, 15,000 corpus characters, and 15 seconds bounded waiting.
- Default maximum concurrent tool HTTP executions is one. The pilot key can carry its own tool allowlist.

## Honest capability labels

- `corpus_assess`: deterministic duplicate/concentration analysis works and a real Partner preparation job is created.
- `document_screen`: Partner inquiry-preparation preview; current platform framing does not yet analyze the supplied document body.
- `narrative_trace`: Partner inquiry-preparation preview; it does not yet reconstruct transmission or establish attribution.

No result should be described as completed verification merely because a preparation job completed.

## Production activation checkpoint

Production activation requires explicit approval to:

1. Create the isolated `veristrata_ai_tools` database and least-privilege database user, then apply the checked-in migrations.
2. Copy the already-working Partner base URL and `vsk_` credential into the AI Tools service environment without printing or committing either value.
3. Deploy the reviewed private-repository build, replace the earlier preview Nginx host with `tools.veristrata.ai`, add DNS, and issue TLS.
4. Issue Michael's 30-day `ait_` key, run external HTTPS smoke tests, revoke test identities, and retain Michael's raw key only in a root-readable one-time retrieval file.

Recommended initial Michael policy: `tools:execute,diagnostics:read`; one concurrent execution; 10 requests/minute; 100 HTTP requests/month; 5 investigations/month; 30-day expiry. Authorize `corpus_assess` for the first reliable trial, and add preview tools only with their limitations made explicit.
