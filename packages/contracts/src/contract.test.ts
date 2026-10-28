import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("authoritative Partner contract contains exactly 23 operation IDs", async () => {
  const source = await readFile(resolve(process.cwd(), "openapi/partner-openapi.yaml"), "utf8");
  const operations = [...source.matchAll(/^\s+operationId:\s+(\S+)/gm)].map((match) => match[1]);
  assert.equal(operations.length, 23);
  assert.equal(new Set(operations).size, 23);
  assert.ok(operations.includes("createTopic"));
  assert.ok(operations.includes("createTopicContribution"));
});
