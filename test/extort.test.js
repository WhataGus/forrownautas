import test from "node:test";
import assert from "node:assert/strict";
import { applyExtort } from "../game/extort.js";

const participants = (count, deadIds = []) => Array.from({ length: count }, (_, index) => ({
  id: `p${index + 1}`,
  life: 40,
  isDead: deadIds.includes(`p${index + 1}`),
}));

test("Extort applies X to three opponents and returns the full controller gain", () => {
  const result = applyExtort(participants(4), "p1", 3);

  assert.deepEqual(result.players.map((player) => player.life), [49, 37, 37, 37]);
  assert.deepEqual(result.affectedOpponentIds, ["p2", "p3", "p4"]);
  assert.equal(result.affectedCount, 3);
  assert.equal(result.controllerLifeGain, 9);
  assert.equal(result.players[0].life - 40, result.controllerLifeGain);
});

test("Extort with two affected opponents returns six life for X = 3", () => {
  const result = applyExtort(participants(3), "p1", 3);

  assert.deepEqual(result.players.map((player) => player.life), [46, 37, 37]);
  assert.equal(result.controllerLifeGain, 6);
});

test("Extort with X = 1 preserves normal arithmetic", () => {
  const result = applyExtort(participants(4), "p1", 1);

  assert.deepEqual(result.players.map((player) => player.life), [43, 39, 39, 39]);
  assert.equal(result.controllerLifeGain, 3);
});

test("Extort excludes confirmed-dead participants from loss and gain", () => {
  const result = applyExtort(participants(4, ["p4"]), "p1", 3);

  assert.deepEqual(result.players.map((player) => player.life), [46, 37, 37, 40]);
  assert.deepEqual(result.affectedOpponentIds, ["p2", "p3"]);
  assert.equal(result.controllerLifeGain, 6);
});

test("repeated Extort actions accumulate their exact historical gain", () => {
  const first = applyExtort(participants(4), "p1", 2);
  const second = applyExtort(first.players, "p1", 1);
  const recordedLifeGained = first.controllerLifeGain + second.controllerLifeGain;

  assert.deepEqual(second.players.map((player) => player.life), [49, 37, 37, 37]);
  assert.equal(recordedLifeGained, 9);
  assert.equal(second.players[0].life - 40, recordedLifeGained);
});

test("Extort arithmetic is generic for two-player and six-player games", () => {
  const twoPlayer = applyExtort(participants(2), "p1", 4);
  const sixPlayer = applyExtort(participants(6), "p1", 2);

  assert.deepEqual(twoPlayer.players.map((player) => player.life), [44, 36]);
  assert.equal(twoPlayer.controllerLifeGain, 4);
  assert.deepEqual(sixPlayer.players.map((player) => player.life), [50, 38, 38, 38, 38, 38]);
  assert.equal(sixPlayer.controllerLifeGain, 10);
});

test("Extort with no affected opponents changes no life and returns zero gain", () => {
  const players = participants(3, ["p2", "p3"]);
  const result = applyExtort(players, "p1", 3);

  assert.deepEqual(result.players.map((player) => player.life), [40, 40, 40]);
  assert.deepEqual(result.affectedOpponentIds, []);
  assert.equal(result.controllerLifeGain, 0);
});

test("Extort does not mutate its input state", () => {
  const players = participants(4);
  const snapshot = structuredClone(players);

  const result = applyExtort(players, "p1", 3);

  assert.deepEqual(players, snapshot);
  assert.notEqual(result.players, players);
  result.players.forEach((player, index) => assert.notEqual(player, players[index]));
});
