# VeriStrata AI Tools

An open-source collaboration-preview toolkit for evidence-aware AI workflows built on the VeriStrata Partner API. It provides a TypeScript SDK for all 23 Partner operations, an MCP server, deterministic corpus-integrity checks, optional isolated MariaDB persistence, Swagger documentation, and the **VeriStrata AI Tools Lab** React console.

> Status: collaboration preview. Similarity, source concentration, and narrative recurrence are discovery signals—not proof of coordination, sponsorship, origin, intent, or foreign influence.

## Open-source boundary

The toolkit code, MCP server, SDK, deterministic checks, examples, and Lab are released under the MIT License. The hosted VeriStrata service, private platform implementation, credentials, customer investigations, and operational data are not included.

The Partner OpenAPI document is included as separately licensed interoperability documentation and is excluded from the repository-wide MIT grant. See [the Partner contract notice](LICENSES/VERISTRATA-PARTNER-API-CONTRACT.md). Running the hosted workflows requires an authorized Partner service credential; publishing or cloning this repository does not provide one.

## What is included

- `document_screen`: frames an evidence-backed inquiry around a bounded text sample.
- `narrative_trace`: frames an inquiry across bounded source texts without assuming attribution.
- `corpus_assess`: detects exact/near duplication and domain concentration, then starts a Partner inquiry.
- Complete 23-operation TypeScript Partner client.
- MCP v2 stdio server for use by any compatible model host.
- React/Vite Lab with Dashboard, Tool Explorer, Document Screening, Narrative Trace, Corpus Assessment, Evidence Explorer, Evaluation Lab, Swagger API Explorer, and Diagnostics.
- Optional `veristrata_ai_tools` MariaDB schema. It has no cross-database joins or foreign keys.
- Separate `ait_` client access keys with hashing, revocation, quotas, rate limiting and usage auditing.

## Quick start

```bash
cp .env.example .env
npm install
npm run build
npm run dev
```

Open `http://127.0.0.1:5174`. The local API and Swagger UI run at `http://127.0.0.1:8787`; Vite proxies `/api` and `/swagger` during development.

To run the MCP server after building:

```bash
VERISTRATA_BASE_URL=http://127.0.0.1:3000/api/v1/partner \
VERISTRATA_API_KEY=vsk_replace_me \
npm run mcp
```

The `vsk_` key stays in the server/MCP process and is never sent to the browser or included in structured tool results. Hosted API clients use a separate `ait_` key; see [ACCESS_KEYS.md](docs/ACCESS_KEYS.md).

## Repository map

```text
apps/tools-lab/          React console and allowlisted local API
packages/contracts/      Authoritative Partner OpenAPI contract and tool catalog
packages/sdk-typescript/ TypeScript client for all 23 operations
packages/integrity-core/ Deterministic, model-free integrity checks
packages/mcp-server/     MCP server and shared workflows
database/migrations/     Separate AI-tools-owned persistence
docs/                    Audit, runbook, security and roadmap
examples/                Model-host and workflow examples
```

## Important current boundary

The Partner API stores registered URL/text sources, but current topic preparation frames claims from the topic title. Full source-aware extraction, document-level provenance, and cross-source transmission reconstruction require a reviewed extension to the canonical platform pipeline. This repository does not create a second evidence pipeline.

See [PUBLIC_ARCHITECTURE.md](docs/architecture/PUBLIC_ARCHITECTURE.md), [RUNBOOK.md](docs/RUNBOOK.md), and [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md).

## Contributing and license

Contributions are welcome; start with [CONTRIBUTING.md](CONTRIBUTING.md). Toolkit code is MIT licensed. The Partner OpenAPI document has a separate proprietary interoperability notice, and the hosted VeriStrata service and private platform remain separate products.
