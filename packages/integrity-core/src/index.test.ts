import assert from "node:assert/strict";
import test from "node:test";
import { assessCorpusPreflight } from "./index.js";

test("corpus preflight identifies exact duplicates and domain concentration", () => {
  const repeated = "A repeated account of the same event with enough words to create several shingles for comparison.";
  const result = assessCorpusPreflight([
    { document_id: "a", url: "https://example.org/a", text: repeated },
    { document_id: "b", url: "https://example.org/b", text: repeated },
    { document_id: "c", url: "https://independent.test/c", text: "A materially different account with distinct evidence and a separate chain of publication." },
  ]);
  assert.deepEqual(result.exact_duplicate_groups, [{ document_ids: ["a", "b"] }]);
  assert.equal(result.unique_domains, 2);
  assert.equal(result.source_concentration.dominant_domain, "example.org");
  assert.equal(result.source_concentration.ratio, 0.667);
});

test("corpus preflight labels close rewrites as candidates, not attribution", () => {
  const result = assessCorpusPreflight([
    { document_id: "a", text: "one two three four five six seven eight nine ten eleven twelve thirteen" },
    { document_id: "b", text: "one two three four five six seven eight nine ten eleven twelve fourteen" },
  ]);
  assert.equal(result.near_duplicate_pairs.length, 1);
  assert.match(result.limitations[0] || "", /does not establish/i);
});
