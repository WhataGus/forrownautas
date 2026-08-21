import test from "node:test";
import assert from "node:assert/strict";
import { canSubmitSave, submitMatchRequest } from "../game/save-flow.js";

const response = (status, body, json = true) => ({ ok: status >= 200 && status < 300, status, json: json ? async () => body : async () => { throw new Error("bad json"); } });

test("production save flow permits reset only after a valid success response", async () => {
  assert.deepEqual(await submitMatchRequest(async () => response(201, { id: "match-1" }), {}), { ok: true, id: "match-1" });
  assert.equal((await submitMatchRequest(async () => response(201, {}), {})).ok, false);
});

test("production save flow normalizes API and network failures", async () => {
  const invalid = await submitMatchRequest(async () => response(422, { error: "a match requires between 2 and 6 players", code: "invalid_participant_count" }), {});
  assert.deepEqual(invalid, { ok: false, error: "a match requires between 2 and 6 players", code: "invalid_participant_count" });
  assert.equal((await submitMatchRequest(async () => response(500, {}), {})).ok, false);
  assert.equal((await submitMatchRequest(async () => { throw new Error("offline"); }, {})).ok, false);
});

test("production save guard blocks duplicate in-flight submissions", () => {
  assert.equal(canSubmitSave(false), true);
  assert.equal(canSubmitSave(true), false);
});
