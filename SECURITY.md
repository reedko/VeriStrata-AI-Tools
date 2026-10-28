# Security policy

Do not commit `.env`, `vsk_` Partner keys, MariaDB credentials, private prompts, private platform code, assessment payloads, or user documents.

The Lab API intentionally exposes only named routes. It is not an arbitrary reverse proxy. Production authenticates privileged routes with revocable `ait_` client keys while the upstream `vsk_` key remains server-only. Operators must also apply edge rate limits, request-size limits, TLS, and restricted CORS. Swagger and static assets may be public.

Corpus and narrative signals are diagnostic observations. Never use them alone to identify an actor, label content as propaganda, infer nationality, or take automated punitive action. Retain provenance and human review.

Report vulnerabilities privately to the VeriStrata maintainers rather than opening a public issue containing exploit details or secrets.
