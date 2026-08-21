import test from "node:test";
import assert from "node:assert/strict";
import { DAMAGE_TYPE } from "../shared/damage-types.js";
import { MatchContractError, validateMatchContract } from "../netlify/lib/match-contract.js";

const roster = {
  players: ["p1", "p2", "p3"].map((id, index) => ({ id, name: `Roster ${index + 1}` })),
  decks: ["p1", "p2", "p3"].map((playerId, index) => ({ id: `d${index + 1}`, playerId, name: `Deck ${index + 1}` })),
};

const validPayload = () => ({
  durationSeconds: 120,
  winCondition: "Combo",
  wentInfinite: true,
  turnCount: 8,
  startingLife: 40,
  startingSeat: 0,
  playerCount: 99,
  players: [
    { playerId: "p1", deckId: "d1", playerName: "forged", deckName: "forged", isWinner: true, placement: 1, finalLife: 40, poisonReceived: 0, mulligans: 0, lifeGained: 0, eliminatedAtSeconds: null, eliminationReason: null },
    { playerId: "p2", deckId: "d2", playerName: "forged", deckName: "forged", isWinner: false, placement: 0, finalLife: 20, poisonReceived: 0, mulligans: 1, lifeGained: 0, eliminatedAtSeconds: null, eliminationReason: null },
    { playerId: "p3", deckId: "d3", playerName: "forged", deckName: "forged", isWinner: false, placement: 0, finalLife: 15, poisonReceived: 0, mulligans: 0, lifeGained: 2, eliminatedAtSeconds: null, eliminationReason: null },
  ],
  damage: [{ sourceSeat: 1, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 4 }],
});

const expectCode = (payload, code) => assert.throws(() => validateMatchContract(payload, roster), (error) => error instanceof MatchContractError && error.code === code);

test("declared-winner matches preserve wentInfinite, derive count, and resolve roster snapshots", () => {
  const contract = validateMatchContract(validPayload(), roster);
  assert.equal(contract.completion, "declared_winner");
  assert.equal(contract.match.playerCount, 3);
  assert.equal(contract.match.wentInfinite, true);
  assert.equal(contract.players[0].playerName, "Roster 1");
  assert.equal(contract.players[0].deckName, "Deck 1");
  assert.deepEqual(contract.damage[0], { sourceSeat: 1, targetSeat: 1, damageType: DAMAGE_TYPE.COMMANDER, amount: 4 });
});

test("participant count, persistent identity, and deck ownership are enforced", () => {
  const tooFew = validPayload(); tooFew.players = tooFew.players.slice(0, 1); expectCode(tooFew, "invalid_participant_count");
  const duplicate = validPayload(); duplicate.players[2].playerId = "p1"; expectCode(duplicate, "duplicate_player");
  const missing = validPayload(); missing.players[1].playerId = null; expectCode(missing, "invalid_player");
  const mismatch = validPayload(); mismatch.players[1].deckId = "d1"; expectCode(mismatch, "deck_player_mismatch");
});

test("starting seat, booleans, numeric values, and damage matrix integrity are validated", () => {
  const start = validPayload(); start.startingSeat = 3; expectCode(start, "invalid_starting_seat");
  const infinite = validPayload(); infinite.wentInfinite = "true"; expectCode(infinite, "invalid_went_infinite");
  const poison = validPayload(); poison.players[1].poisonReceived = -1; expectCode(poison, "invalid_poison");
  const life = validPayload(); life.players[1].finalLife = -2; assert.doesNotThrow(() => validateMatchContract(life, roster));
  const type = validPayload(); type.damage[0].damageType = 99; expectCode(type, "invalid_damage_type");
  const duplicateDamage = validPayload(); duplicateDamage.damage.push({ ...duplicateDamage.damage[0] }); expectCode(duplicateDamage, "duplicate_damage");
});

test("elimination completion requires known placements, while unknown declared losers use zero", () => {
  const elimination = validPayload();
  elimination.players[1] = { ...elimination.players[1], placement: 3, eliminatedAtSeconds: 20, eliminationReason: "Vida chegou a 0" };
  elimination.players[2] = { ...elimination.players[2], placement: 2, eliminatedAtSeconds: 30, eliminationReason: "10 marcadores de Veneno" };
  assert.equal(validateMatchContract(elimination, roster).completion, "elimination");
  const fabricated = validPayload(); fabricated.players[1].placement = 2; expectCode(fabricated, "unknown_placement");
  const winners = validPayload(); winners.players[1].isWinner = true; winners.players[1].placement = 1; expectCode(winners, "duplicate_placement");
});
