import test from "node:test";
import assert from "node:assert/strict";
import { DAMAGE_TYPE } from "../game/domain.js";
import { applyFrontendDamage, applyTrackedDamage, createFrontendMatch, damagePayloadFrom, projectCommanderDamage, startingSeatOf } from "../game/frontend-adapter.js";

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

const trackerPlayers = (ids = ["a", "b"]) => ids.map((id, seat) => ({
  id,
  userId: `player-${id}`,
  deckId: `deck-${id}`,
  name: id.toUpperCase(),
  commander: `Commander ${id.toUpperCase()}`,
  life: 40,
  poison: 0,
  commanderDamage: {},
  seat,
}));

const commanderAction = (sourceId, targetId, amount = 1) => ({
  sourceId,
  targetId,
  selectedDamageType: "commander",
  amount,
  isInfect: false,
  isLifelink: false,
});

test("confirmed commander damage updates life, canonical state, display, and save projection once", () => {
  let displayed = trackerPlayers();
  let match = createFrontendMatch(displayed, 0, 40);
  ({ match, players: displayed } = applyFrontendDamage(match, displayed, commanderAction("a", "b")));
  assert.equal(displayed[1].life, 39);
  assert.deepEqual(displayed[1].commanderDamage, { a: 1 });
  assert.deepEqual(damagePayloadFrom(match), [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 1 }]);
});

test("repeated one-point commander damage remains reconciled across life, display, canonical state, and save", () => {
  let displayed = trackerPlayers();
  let match = createFrontendMatch(displayed, 0, 40);
  for (let count = 0; count < 3; count += 1) {
    ({ match, players: displayed } = applyFrontendDamage(match, displayed, commanderAction("a", "b")));
  }
  assert.equal(displayed[1].life, 37);
  assert.deepEqual(displayed[1].commanderDamage, { a: 3 });
  assert.deepEqual(projectCommanderDamage(match, displayed)[1].commanderDamage, { a: 3 });
  assert.deepEqual(damagePayloadFrom(match), [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 3 }]);
});

test("multiple commander sources remain independent and reconcile to total life loss", () => {
  let displayed = trackerPlayers(["a", "b", "c", "target"]);
  let match = createFrontendMatch(displayed, 0, 40);
  for (const [sourceId, count] of [["a", 3], ["b", 2], ["c", 1]]) {
    for (let applied = 0; applied < count; applied += 1) {
      ({ match, players: displayed } = applyFrontendDamage(match, displayed, commanderAction(sourceId, "target")));
    }
  }
  assert.equal(displayed[3].life, 34);
  assert.deepEqual(displayed[3].commanderDamage, { a: 3, b: 2, c: 1 });
  assert.deepEqual(damagePayloadFrom(match), [
    { sourceSeat: 0, targetSeat: 3, damageType: DAMAGE_TYPE.COMMANDER, amount: 3 },
    { sourceSeat: 1, targetSeat: 3, damageType: DAMAGE_TYPE.COMMANDER, amount: 2 },
    { sourceSeat: 2, targetSeat: 3, damageType: DAMAGE_TYPE.COMMANDER, amount: 1 },
  ]);
});

test("infect overrides a stale commander selection without creating commander display or save data", () => {
  let displayed = trackerPlayers();
  let match = createFrontendMatch(displayed, 0, 40);
  ({ match, players: displayed } = applyFrontendDamage(match, displayed, {
    ...commanderAction("a", "b"),
    isInfect: true,
  }));
  assert.equal(displayed[1].life, 40);
  assert.equal(displayed[1].poison, 1);
  assert.deepEqual(displayed[1].commanderDamage, {});
  assert.deepEqual(damagePayloadFrom(match), [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.INFECT, amount: 1 }]);
});

test("ordinary combat changes life without creating commander damage", () => {
  let displayed = trackerPlayers();
  let match = createFrontendMatch(displayed, 0, 40);
  ({ match, players: displayed } = applyFrontendDamage(match, displayed, {
    ...commanderAction("a", "b", 2),
    selectedDamageType: "combat",
  }));
  assert.equal(displayed[1].life, 38);
  assert.deepEqual(displayed[1].commanderDamage, {});
  assert.deepEqual(damagePayloadFrom(match), [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.COMBAT, amount: 2 }]);
});

test("commander correction reprojects display and save data without restoring life", () => {
  let displayed = trackerPlayers();
  let match = createFrontendMatch(displayed, 0, 40);
  ({ match, players: displayed } = applyFrontendDamage(match, displayed, commanderAction("a", "b")));
  const lifeAfterDamage = displayed[1].life;
  match = applyTrackedDamage(match, { sourceId: "a", targetId: "b", damageType: DAMAGE_TYPE.COMMANDER, amount: -1 });
  displayed = projectCommanderDamage(match, displayed);
  assert.equal(displayed[1].life, lifeAfterDamage);
  assert.deepEqual(displayed[1].commanderDamage, {});
  assert.deepEqual(damagePayloadFrom(match), []);
});
