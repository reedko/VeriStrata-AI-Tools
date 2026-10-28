import assert from "node:assert/strict";
import test from "node:test";
import { accessKeyPrefix, generateAccessKey, hashAccessKey } from "./accessKeys.js";

test("AI Tools keys are high-entropy, prefixed, and stored by one-way hash", () => {
  const first = generateAccessKey();
  const second = generateAccessKey();
  assert.match(first, /^ait_[A-Za-z0-9_-]{32}$/);
  assert.notEqual(first, second);
  assert.match(hashAccessKey(first), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(hashAccessKey(first), /ait_/);
  assert.match(accessKeyPrefix(first), /^ait_.+…$/);
});
