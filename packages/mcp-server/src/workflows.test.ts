import assert from "node:assert/strict";
import test from "node:test";
import { PartnerClient } from "@veristrata-ai-tools/sdk";
import { IntegrityWorkflows } from "./workflows.js";

function mockFetch(responses: unknown[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), ...(init ? { init } : {}) });
    const body = responses.shift();
    return new Response(JSON.stringify({ data: body }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

test("document_screen composes topic creation and preparation without exposing the key", async () => {
  const mock = mockFetch([
    { topic_id: "topic-1", title: "The asserted fact is accurate", state: "created", snapshot_version: 1 },
    { job_id: "job-1", status: "queued" },
  ]);
  const workflows = new IntegrityWorkflows(new PartnerClient("https://api.test/v1/", "vsk_secret", mock.fetchImpl));
  const result = await workflows.documentScreen({ focus: "The asserted fact is accurate", text: "This document contains a sufficiently long factual passage." });
  assert.equal(result.assessment_kind, "document_screen");
  assert.equal(mock.calls[0]?.url, "https://api.test/v1/topics");
  assert.equal(mock.calls[1]?.url, "https://api.test/v1/topics/topic-1/prepare");
  assert.equal(new Headers(mock.calls[0]?.init?.headers).get("authorization"), "Bearer vsk_secret");
  assert.doesNotMatch(JSON.stringify(result), /vsk_secret/);
});

test("corpus_assess returns deterministic preflight alongside the VeriStrata job", async () => {
  const mock = mockFetch([
    { topic_id: "topic-2", title: "Assess independent corroboration", state: "created", snapshot_version: 1 },
    { job_id: "job-2", status: "queued" },
  ]);
  const workflows = new IntegrityWorkflows(new PartnerClient("https://api.test/v1", "vsk_secret", mock.fetchImpl));
  const repeated = "This sufficiently long document is intentionally duplicated for deterministic testing.";
  const result = await workflows.corpusAssess({
    focus: "Assess whether these reports independently corroborate the central claim",
    documents: [
      { document_id: "one", text: repeated },
      { document_id: "two", text: repeated },
    ],
  });
  assert.equal(result.deterministic_preflight.exact_duplicate_groups.length, 1);
  const body = JSON.parse(String(mock.calls[0]?.init?.body));
  assert.equal(body.seed_sources.length, 2);
  assert.match(body.partner_external_id, /^asfai-corpus-/);
});
