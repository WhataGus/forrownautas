import test from "node:test";
import assert from "node:assert/strict";
import {
  DAMAGE_TYPE,
  ELIMINATION_REASON,
  adjustDamage,
  adjustLife,
  adjustMulligans,
  adjustPoison,
  advanceFourPlayerTurn,
  buildMatchPayload,
  commanderDamageAgainst,
  commanderDamageFrom,
  confirmElimination,
  createMatch,
  getEliminationEligibility,
  getMatchStatus,
  getNormalPlacements,
  resetMatch,
} from "../game/domain.js";

const participants = (count = 4) => Array.from({ length: count }, (_, index) => ({
  id: `p${index + 1}`,
  playerId: `user-${index + 1}`,
  deckId: `deck-${index + 1}`,
  playerName: `Player ${index + 1}`,
  deckName: `Deck ${index + 1}`,
}));

test("new matches initialize each participant at the selected starting life", () => {
  const state = createMatch({ players: participants(), startingLife: 30, startingPlayerId: "p2" });
  assert.deepEqual(state.players.map((player) => player.life), [30, 30, 30, 30]);
  assert.equal(state.activePlayerId, "p2");
  assert.equal(state.startingPlayerId, "p2");
  assert.equal(state.turnNumber, 1);
});

test("life changes preserve negative totals and make life at or below zero eligible", () => {
  let state = createMatch({ players: participants() });
  state = adjustLife(state, "p1", 3);
  state = adjustLife(state, "p1", -45);
  assert.equal(state.players[0].life, -2);
  assert.equal(state.players[0].lifeGained, 3);
  assert.deepEqual(getEliminationEligibility(state, "p1"), { playerId: "p1", reason: ELIMINATION_REASON.LIFE });
});

test("mulligans may decrease but never become negative", () => {
  let state = createMatch({ players: participants() });
  state = adjustMulligans(state, "p1", 2);
  state = adjustMulligans(state, "p1", -1);
  state = adjustMulligans(state, "p1", -5);
  assert.equal(state.players[0].mulligans, 0);
});

test("poison is independent of life, can decrease, and qualifies at ten", () => {
  let state = createMatch({ players: participants() });
  state = adjustPoison(state, "p1", 10);
  state = adjustPoison(state, "p1", -1);
  assert.equal(state.players[0].poison, 9);
  assert.equal(getEliminationEligibility(state, "p1"), null);
  state = adjustPoison(state, "p1", 1);
  assert.deepEqual(getEliminationEligibility(state, "p1"), { playerId: "p1", reason: ELIMINATION_REASON.POISON });
});

test("commander damage is source-target specific and one source must reach 21", () => {
  let state = createMatch({ players: participants() });
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 10 });
  state = adjustDamage(state, { sourceId: "p3", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 11 });
  assert.deepEqual(commanderDamageAgainst(state, "p2"), { p1: 10, p3: 11 });
  assert.equal(getEliminationEligibility(state, "p2"), null);
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 10 });
  assert.equal(commanderDamageFrom(state, "p1", "p2"), 20);
  assert.equal(getEliminationEligibility(state, "p2"), null);
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 1 });
  assert.equal(commanderDamageFrom(state, "p1", "p2"), 21);
  assert.deepEqual(getEliminationEligibility(state, "p2"), {
    playerId: "p2",
    reason: ELIMINATION_REASON.COMMANDER,
    sourceId: "p1",
  });
});

test("damage adjustments change only their targeted source-target relationship", () => {
  let state = createMatch({ players: participants() });
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 8 });
  state = adjustDamage(state, { sourceId: "p1", targetId: "p3", damageType: DAMAGE_TYPE.COMMANDER, amount: 5 });
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: -3 });
  assert.equal(commanderDamageFrom(state, "p1", "p2"), 5);
  assert.equal(commanderDamageFrom(state, "p1", "p3"), 5);
});

test("confirmed elimination is separate from eligibility and idempotent", () => {
  let state = createMatch({ players: participants() });
  state = adjustPoison(state, "p1", 10);
  assert.equal(state.players[0].isEliminated, false);
  state = confirmElimination(state, "p1", 42);
  const confirmed = confirmElimination(state, "p1", 99);
  assert.equal(confirmed, state);
  assert.equal(state.players[0].isEliminated, true);
  assert.deepEqual(state.eliminations.p1, { atSeconds: 42, reason: ELIMINATION_REASON.POISON });
});

test("one elimination in four players does not complete the match", () => {
  let state = createMatch({ players: participants() });
  state = confirmElimination(adjustLife(state, "p1", -40), "p1", 10);
  assert.deepEqual(getMatchStatus(state), { status: "in_progress", winnerId: null });
});

test("one elimination in two players completes a normal match and derives its winner", () => {
  let state = createMatch({ players: participants(2) });
  state = confirmElimination(adjustLife(state, "p1", -40), "p1", 10);
  assert.deepEqual(getMatchStatus(state), { status: "complete", winnerId: "p2" });
  assert.deepEqual(getNormalPlacements(state), { p2: 1, p1: 2 });
});

test("four-player turns follow the prototype's visual clockwise map and skip eliminated seats", () => {
  let state = createMatch({ players: participants(), startingPlayerId: "p1" });
  state = advanceFourPlayerTurn(state);
  assert.equal(state.activePlayerId, "p2");
  state = advanceFourPlayerTurn(state);
  assert.equal(state.activePlayerId, "p4");
  state = confirmElimination(adjustLife(state, "p3", -40), "p3", 20);
  state = advanceFourPlayerTurn(state);
  assert.equal(state.activePlayerId, "p1");
  assert.equal(state.turnNumber, 2);
  assert.equal(state.startingPlayerId, "p1");
});

test("reset starts a clean match without inherited transient values", () => {
  let state = createMatch({ players: participants(), startingLife: 40, startingPlayerId: "p2" });
  state = adjustLife(state, "p1", -8);
  state = adjustPoison(state, "p1", 4);
  state = adjustMulligans(state, "p1", 2);
  state = adjustDamage(state, { sourceId: "p2", targetId: "p1", damageType: DAMAGE_TYPE.COMMANDER, amount: 12 });
  state = confirmElimination(adjustLife(state, "p1", -32), "p1", 30);
  state = resetMatch(state);
  assert.equal(state.activePlayerId, "p2");
  assert.equal(state.turnNumber, 1);
  assert.deepEqual(state.damage, {});
  assert.deepEqual(state.eliminations, {});
  assert.deepEqual(state.players[0], {
    ...participants()[0], life: 40, poison: 0, mulligans: 0, lifeGained: 0, isEliminated: false,
  });
});

test("normal completed-match payload maps authoritative state to the existing API contract", () => {
  let state = createMatch({ players: participants(3), startingLife: 40, startingPlayerId: "p1" });
  state = adjustDamage(state, { sourceId: "p1", targetId: "p2", damageType: DAMAGE_TYPE.COMMANDER, amount: 21 });
  state = confirmElimination(state, "p2", 15);
  state = adjustPoison(state, "p3", 10);
  state = confirmElimination(state, "p3", 25);
  state = adjustLife(state, "p1", 5);
  const payload = buildMatchPayload(state, { durationSeconds: 120, winCondition: "Combate" });

  assert.deepEqual(payload, {
    durationSeconds: 120,
    winCondition: "Combate",
    wentInfinite: false,
    turnCount: 1,
    startingLife: 40,
    startingSeat: 0,
    players: [
      { playerId: "user-1", deckId: "deck-1", playerName: "Player 1", deckName: "Deck 1", isWinner: true, placement: 1, finalLife: 45, poisonReceived: 0, mulligans: 0, lifeGained: 5, eliminatedAtSeconds: null, eliminationReason: null },
      { playerId: "user-2", deckId: "deck-2", playerName: "Player 2", deckName: "Deck 2", isWinner: false, placement: 3, finalLife: 40, poisonReceived: 0, mulligans: 0, lifeGained: 0, eliminatedAtSeconds: 15, eliminationReason: ELIMINATION_REASON.COMMANDER },
      { playerId: "user-3", deckId: "deck-3", playerName: "Player 3", deckName: "Deck 3", isWinner: false, placement: 2, finalLife: 40, poisonReceived: 10, mulligans: 0, lifeGained: 0, eliminatedAtSeconds: 25, eliminationReason: ELIMINATION_REASON.POISON },
    ],
    damage: [{ sourceSeat: 0, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 21 }],
  });
});
