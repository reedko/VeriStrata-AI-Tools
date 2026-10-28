import assert from "node:assert/strict";
import test from "node:test";
import { parseToolInput } from "./validation.js";

test("public demo accepts bounded text-only document screening", () => {
  const result = parseToolInput("document_screen", { focus: "What evidence supports this factual claim?", text: "A harmless short source passage for a bounded demonstration.", wait_seconds: 10 });
  assert.equal(result.wait_seconds, 10);
});

test("public demo rejects URL fetching and internal content IDs", () => {
  assert.throws(() => parseToolInput("document_screen", { focus: "What evidence supports this factual claim?", url: "http://127.0.0.1/admin" }), /Invalid or unsafe/);
  assert.throws(() => parseToolInput("document_screen", { focus: "What evidence supports this factual claim?", content_id: 1 }), /Invalid or unsafe/);
});

test("public demo caps corpus size and document length", () => {
  const documents = Array.from({ length: 6 }, (_, index) => ({ document_id: String(index), text: "A sufficiently long bounded source passage." }));
  assert.throws(() => parseToolInput("corpus_assess", { documents }), /Invalid or unsafe/);
  assert.throws(() => parseToolInput("corpus_assess", { documents: [{ document_id: "a", text: "x".repeat(5001) }, { document_id: "b", text: "short but sufficiently long" }] }), /Invalid or unsafe/);
});
