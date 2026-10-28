# Public architecture

## Purpose

VeriStrata AI Tools adds model-host and developer interfaces around an evidence workflow without copying the hosted service or creating a competing evidence system. The public repository contains the integration layer: contracts, SDK, MCP tools, deterministic checks, a protected HTTP service, and a developer Lab.

```text
model host / browser / client
          |
          | MCP or authenticated ait_ HTTP request
          v
VeriStrata AI Tools
  - bounded validation
  - deterministic corpus preflight
  - client quotas and usage audit
  - SDK and workflow orchestration
          |
          | server-held vsk_ credential
          v
authorized VeriStrata Partner service
```

## Public components

- `packages/contracts`: AI Tools OpenAPI contract, tool catalog, and separately licensed Partner interoperability contract.
- `packages/sdk-typescript`: typed client for the documented Partner operations.
- `packages/integrity-core`: deterministic exact/near-duplicate and source-concentration signals.
- `packages/mcp-server`: MCP surface and shared workflow orchestration.
- `apps/tools-lab`: React console and a narrow, authenticated HTTP API.
- `database/migrations`: isolated access-key, ownership, assessment, and usage-audit storage.

## Hosted boundary

The hosted VeriStrata service and its private implementation are not part of this repository. A public clone can run the Lab, documentation, deterministic checks, tests, and MCP surface, but live Partner-backed preparation requires a separately authorized service credential.

The current Partner preparation step frames an inquiry from its explicit focus. Registered source text is retained as seed material, but the public workflows must not be represented as complete source-aware claim extraction, poisoning detection, transmission reconstruction, or actor attribution.

## Workflow status

| Workflow | Current result | Boundary |
|---|---|---|
| `corpus_assess` | Deterministic duplicate/concentration preflight plus a Partner inquiry | Similarity is triage, not proof of copying or coordination. |
| `document_screen` | Bounded document inquiry preparation | Not a completed document-verification or poisoning report. |
| `narrative_trace` | Bounded multi-text inquiry preparation | Does not reconstruct transmission or establish attribution. |

## Security model

- Public clients receive revocable `ait_` credentials with scopes, tool allowlists, expiry, quotas, rate limits, and concurrency limits.
- The upstream `vsk_` credential remains in the server or MCP process and is never returned to clients.
- Hosted input is text-only and size bounded; arbitrary URL fetching and platform content IDs are disabled.
- Client-owned assessment/topic mappings prevent one pilot identity from reading another's resources.
- TLS, edge throttling, request-size limits, and human review are required in production.

## Extension principles

Future source-aware extraction and provenance features should retain retrieval time, content hashes, transformation history, uncertainty, and review decisions. Similarity observations must remain distinct from claims about copying, coordination, sponsorship, origin, or intent.
