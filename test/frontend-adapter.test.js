import test from "node:test";
import assert from "node:assert/strict";
import { DAMAGE_TYPE } from "../game/domain.js";
import { applyTrackedDamage, createFrontendMatch, damagePayloadFrom, projectCommanderDamage, startingSeatOf } from "../game/frontend-adapter.js";

const players = [{ id: "a", userId: "pa", deckId: "da", name: "A", commander: "CA" }, { id: "b", userId: "pb", deckId: "db", name: "B", commander: "CB" }];

test("adapter keeps starting seat immutable and projects commander damage from canonical data", () => {
  let match = createFrontendMatch(players, 0, 20);
  assert.equal(match.startingLife, 20);
  assert.deepEqual(match.players.map((player) => player.life), [20, 20]);
  match = { ...match, activePlayerId: "b" };
  assert.equal(startingSeatOf(match), 0);
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: 3 });
  assert.equal(projectCommanderDamage(match, players)[1].commanderDamage.a, 3);
  assert.deepEqual(damagePayloadFrom(match), [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 3 }]);
});

test("damage corrections never become negative or emit zero persistence rows", () => {
  let match = createFrontendMatch(players, 0);
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: 2 });
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: -1 });
  assert.equal(projectCommanderDamage(match, players)[1].commanderDamage.a, 1);
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: -1 });
  assert.deepEqual(projectCommanderDamage(match, players)[1].commanderDamage, {});
  assert.deepEqual(damagePayloadFrom(match), []);
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: -5 });
  assert.deepEqual(damagePayloadFrom(match), []);
});
