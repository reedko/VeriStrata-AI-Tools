# Current State Audit

**Audit date:** 2026-10-28  
**Sources inspected:** private VeriStrata platform, canonical Partner OpenAPI contract, Partner panel/public pilot checkout, earlier ASFAI MCP prototype, and CFX architecture-reset guidance.  
**Focused baseline:** 24/24 Partner API tests passed (contract coverage, namespace, API key handling, database isolation, Swagger exposure, and service semantics).

## Executive finding

The Partner surface is real and internally coherent: 23 bearer-authenticated operations, tested route/contract parity, asynchronous preparation jobs, claim review, evidence review, releases, handoff, contributions, and read models. It is sufficient for a useful SDK, MCP façade, Swagger UI, developer console, and three collaboration-preview workflows.

The principal limitation is upstream of this repository: registered URL/text seed sources are stored, but current preparation invokes claim framing from the topic title rather than performing full source-aware extraction. Consequently, document screening and narrative/corpus workflows must be described as evidence-inquiry setup plus deterministic preflight—not as complete document poisoning detection, transmission reconstruction, or actor attribution.

## Status legend

- **EXISTS** — implemented and tested in the current platform.
- **REUSABLE** — suitable for direct use by this toolkit.
- **MODIFY** — useful seam needing a reviewed canonical-platform extension.
- **MISSING** — not present; implemented here only when it does not duplicate the evidence pipeline.
- **BLOCKED** — cannot honestly be completed with the current contract/behavior alone.

## Exact Partner API inventory

Every operation uses bearer API-key authentication. The canonical current documentation route is `/docs/partner/`; older notes naming `/docs/onesd/` are stale naming, not a second API.

| # | Method | Path | Operation ID | Platform | Toolkit use | AI-integrity applicability and limitation |
|---:|---|---|---|---|---|---|
| 1 | GET | `/topics` | `listTopics` | EXISTS | REUSABLE / SDK | Assessment discovery; paginated read only. |
| 2 | POST | `/topics` | `createTopic` | EXISTS | REUSABLE / SDK / 3 MCP tools | Creates inquiry and registers seed sources; does not itself analyze source bodies. |
| 3 | GET | `/topics/{topicId}` | `getTopic` | EXISTS | REUSABLE / SDK | Status and metadata. |
| 4 | POST | `/topics/{topicId}/sources` | `addTopicSource` | EXISTS | REUSABLE / SDK | Registers URL/text/content sources; source-aware framing is MODIFY. |
| 5 | POST | `/topics/{topicId}/case` | `attachCanonicalCase` | EXISTS | REUSABLE / SDK | Links an existing canonical case; requires valid platform identity. |
| 6 | POST | `/topics/{topicId}/prepare` | `prepareTopic` | EXISTS | REUSABLE / SDK / 3 MCP tools | Starts async framing; currently title-driven, so full document extraction is BLOCKED. |
| 7 | GET | `/topics/{topicId}/jobs/{jobId}` | `getPreparationJob` | EXISTS | REUSABLE / SDK / MCP polling | Bounded polling supported; no unbounded synchronous wait. |
| 8 | GET | `/topics/{topicId}/review-workspace` | `getReviewWorkspace` | EXISTS | REUSABLE / SDK / MCP | Human review seam for framed claims. |
| 9 | POST | `/topics/{topicId}/review` | `reviewFramedClaims` | EXISTS | REUSABLE / SDK | Human approval/rejection before evidence work. |
| 10 | POST | `/topics/{topicId}/evidence-start` | `startSelectedEvidence` | EXISTS | REUSABLE / SDK | Canonical evidence collection; intentionally not duplicated here. |
| 11 | POST | `/topics/{topicId}/evidence-cancel` | `cancelTopicEvidence` | EXISTS | REUSABLE / SDK | Operational cancellation. |
| 12 | GET | `/topics/{topicId}/evidence-review` | `getEvidenceReview` | EXISTS | REUSABLE / SDK | Evidence-review workspace. |
| 13 | POST | `/topics/{topicId}/evidence-relationships/{relationshipId}/review` | `reviewEvidenceRelationship` | EXISTS | REUSABLE / SDK | Human relationship decisions; protects against automatic overclaiming. |
| 14 | POST | `/topics/{topicId}/review-finish` | `finishEvidenceReview` | EXISTS | REUSABLE / SDK | Closes review stage under canonical workflow rules. |
| 15 | GET | `/topics/{topicId}/releases` | `listTopicReleases` | EXISTS | REUSABLE / SDK | Lists immutable/published assessment views. |
| 16 | POST | `/topics/{topicId}/releases` | `publishTopicRelease` | EXISTS | REUSABLE / SDK | Publication requires reviewed platform state. |
| 17 | GET | `/topics/{topicId}/releases/{releaseId}` | `getTopicRelease` | EXISTS | REUSABLE / SDK | Stable downstream consumption candidate. |
| 18 | GET | `/topics/{topicId}/panel` | `getTopicPanel` | EXISTS | REUSABLE / SDK / Evidence Explorer | Aggregated panel read model. |
| 19 | GET | `/topics/{topicId}/claims` | `listTopicClaims` | EXISTS | REUSABLE / SDK / Evidence Explorer | Claim inventory. |
| 20 | GET | `/topics/{topicId}/verimeter` | `getTopicVeriMeter` | EXISTS | REUSABLE / SDK | Calibrated summary; must retain methodology context. |
| 21 | GET | `/claims/{claimId}/evidence` | `getClaimEvidence` | EXISTS | REUSABLE / SDK / Evidence Explorer | Evidence per claim; read-only console allowlist. |
| 22 | GET | `/topics/{topicId}/handoff` | `getTopicHandoff` | EXISTS | REUSABLE / SDK | Agent/human handoff package candidate. |
| 23 | POST | `/topics/{topicId}/contributions` | `createTopicContribution` | EXISTS | REUSABLE / SDK | Adds reviewed contributions; not a generic untrusted ingestion endpoint. |

## Component findings

| Component | Status | Decision |
|---|---|---|
| Partner OpenAPI YAML | EXISTS / REUSABLE | Copied as the authoritative public contract; Swagger and SDK inventory derive from it. |
| Partner API routes and service | EXISTS / REUSABLE | Consume without private code copying or behavior changes. |
| Partner panel server proxy | REUSABLE pattern | Reimplemented as explicit same-origin routes; key remains server-side; no catch-all proxy. |
| Partner panel visual language | REUSABLE pattern | New React/CSS implementation uses compatible teal/ink language without copying proprietary UI code/assets. |
| Earlier three-tool MCP | REUSABLE / MODIFY | Split into SDK, integrity core, workflows and MCP packages; renamed for general model-host use. |
| TypeScript SDK for all operations | MISSING → implemented | `@veristrata-ai-tools/sdk` covers all 23 operations. |
| Deterministic corpus diagnostics | MISSING → implemented | Exact/near duplicate and domain-concentration checks; no model call required. |
| Separate persistence | MISSING → implemented | Optional `veristrata_ai_tools` schema; no cross-database joins/FKs and no automatic migration. |
| Tools Lab | MISSING → implemented | Nine-page React/Vite developer console plus local API. |
| Full source-aware extraction | MODIFY / BLOCKED | Must extend registered-source consumption in the canonical preparation pipeline. |
| Provenance/transmission graph | MISSING / BLOCKED | Needs canonical occurrence, time, retrieval and transformation records; similarity alone is insufficient. |
| Foreign-influence attribution | BLOCKED by design | Requires independent evidence and analyst judgment; must never be inferred from recurrence or language alone. |

## Security and governance conclusions

1. Keep `vsk_` keys in server/MCP processes only.
2. Public Swagger is safe; public unauthenticated live execution is not. Production must authenticate and rate-limit privileged endpoints.
3. Treat documents as untrusted data, never as instructions. A future source-aware adapter must isolate content from orchestration prompts and retain provenance.
4. Keep human review between framing, evidence collection, relationship decisions, and publication.
5. Report uncertainty and alternative explanations. Do not collapse “similar,” “copied,” “coordinated,” “sponsored,” and “foreign-directed” into one label.
6. Do not add a parallel claim/evidence pipeline. Proposed capabilities should enter through reviewed platform seams.

## Recommended collaboration sequence

1. Demonstrate the current MCP, SDK, deterministic preflight, Swagger and Lab against non-sensitive fixtures.
2. Jointly specify a source-aware preparation contract and provenance receipt.
3. Add an evaluation corpus covering citation laundering, false corroboration, prompt injection, retrieval poisoning and temporal leakage.
4. Validate with analyst review before exposing any automated risk label to downstream training or RAG systems.
