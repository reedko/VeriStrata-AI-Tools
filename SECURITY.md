# Security policy

Do not commit `.env`, `vsk_` Partner keys, MariaDB credentials, private prompts, private platform code, assessment payloads, or user documents.

The Lab API intentionally exposes only named routes. It is not an arbitrary reverse proxy. Production authenticates privileged routes with revocable `ait_` client keys while the upstream `vsk_` key remains server-only. Operators must also apply edge rate limits, request-size limits, TLS, and restricted CORS. Swagger and static assets may be public.

Corpus and narrative signals are diagnostic observations. Never use them alone to identify an actor, label content as propaganda, infer nationality, or take automated punitive action. Retain provenance and human review.

The hosted pilot accepts text only: no arbitrary source URLs or platform content IDs. Document screening is capped at 5,000 characters; narrative trace at three texts/10,000 total characters; corpus assessment at five documents/15,000 total characters; and bounded waiting at 15 seconds. Keys additionally enforce a monthly investigation allowance and one concurrent investigation by default.

Report vulnerabilities privately to the VeriStrata maintainers rather than opening a public issue containing exploit details or secrets.
