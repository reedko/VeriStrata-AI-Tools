import assert from "node:assert/strict";
import test from "node:test";
import { PartnerClient } from "./index.js";

test("Partner client keeps authorization server-side and unwraps data", async () => {
  let authorization = "";
  const mock = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    authorization = new Headers(init?.headers).get("authorization") || "";
    return new Response(JSON.stringify({ data: { topic_id: "topic-1", title: "Test", state: "created", snapshot_version: 1 } }), { status: 200 });
  }) as typeof fetch;
  const result = await new PartnerClient("https://partner.test/", "vsk_secret", mock).getTopic("topic-1");
  assert.equal(result.topic_id, "topic-1");
  assert.equal(authorization, "Bearer vsk_secret");
  assert.doesNotMatch(JSON.stringify(result), /vsk_secret/);
});
