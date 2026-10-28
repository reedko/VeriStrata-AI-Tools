# Pilot readiness

## Required verification

- The Lab builds and displays a prominent `ait_` client-key entry bar.
- AI Tools Swagger and Partner interoperability documentation are served separately.
- Hosted inputs are text-only: no arbitrary URL fetching or internal content IDs.
- Document input is capped at 5,000 characters; narrative input at three texts/10,000 total characters; corpus input at five documents/15,000 total characters; waiting is capped at 15 seconds.
- Access-key acceptance covers issuance, restart persistence, expiration, revocation, scopes, tool allowlists, per-minute limits, monthly request and investigation quotas, usage audit, and client isolation.
- Production binds the application to localhost behind TLS and edge throttling.

## Honest capability labels

- `corpus_assess`: deterministic duplicate/concentration analysis plus a Partner inquiry-preparation job.
- `document_screen`: inquiry-preparation preview; not completed document verification.
- `narrative_trace`: inquiry-preparation preview; not transmission reconstruction or attribution.

A completed preparation job must never be described as completed verification.

## Recommended pilot identity

Issue a separate, expiring `ait_` key for every participant. Start with the minimum required scopes and tool allowlist, one concurrent investigation, conservative per-minute and monthly quotas, and a documented revocation owner. Use only non-sensitive fixtures during initial acceptance, revoke disposable smoke identities, and deliver raw keys through an approved private channel.
