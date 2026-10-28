# Contributing

Thank you for helping improve VeriStrata AI Tools. This project is an early collaboration preview, so small, reviewable changes with explicit capability boundaries are especially valuable.

## Getting started

1. Use Node.js 20 or 22.
2. Copy `.env.example` to `.env`; never commit the resulting file.
3. Run `npm install`, `npm run build`, and `npm test`.
4. Run `npm run dev` for the local Lab and API.

The UI, contracts, deterministic corpus checks, and most tests work without a live Partner credential. Live Partner-backed workflows require an authorized `vsk_` credential kept only in the local or server environment.

## Pull requests

- Keep changes focused and explain the user-visible outcome.
- Add or update tests for behavioral changes.
- Run `npm run build` and `npm test` before requesting review.
- Preserve human review, uncertainty, provenance, and alternative explanations.
- Describe similarity and recurrence as discovery signals, never proof of coordination, sponsorship, origin, nationality, or intent.
- Do not add a second claim/evidence pipeline when the existing Partner workflow is the appropriate integration seam.

## Security and data

Never commit API keys, `.env` files, credentials, private prompts, assessment payloads, user documents, production exports, or customer data. Use synthetic fixtures in tests and examples. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## Licensing boundary

Contributions to the toolkit code are accepted under the MIT License. `packages/contracts/openapi/partner-openapi.yaml` is separately licensed interoperability documentation; do not modify or redistribute it independently without confirming that you have permission. See [the Partner contract notice](LICENSES/VERISTRATA-PARTNER-API-CONTRACT.md).
