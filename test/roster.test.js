import test from "node:test";
import assert from "node:assert/strict";
import { fetchRoster } from "../game/roster.js";

test("loading an empty roster performs one read and no implicit writes", async () => {
  const requests = [];
  const roster = await fetchRoster(async (path, options) => {
    requests.push({ path, method: options?.method ?? "GET" });
    return { json: async () => [] };
  });

  assert.deepEqual(roster, []);
  assert.deepEqual(requests, [{ path: "/api/players", method: "GET" }]);
});
