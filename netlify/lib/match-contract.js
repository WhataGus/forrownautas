import { DAMAGE_TYPE_CODES } from "../../shared/damage-types.js";

const INT16_MIN = -32768;
const INT16_MAX = 32767;
const INT32_MAX = 2147483647;

export class MatchContractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const fail = (code, message) => { throw new MatchContractError(code, message); };
const isIntegerInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const requiredString = (value, code, label) => {
  if (typeof value !== "string" || !value.trim()) fail(code, `${label} is required`);
  return value.trim();
};
const optionalElimination = (value, reason, seat) => {
  const hasTime = value !== null && value !== undefined;
  const hasReason = reason !== null && reason !== undefined && reason !== "";
  if (hasTime !== hasReason) fail("invalid_elimination", `seat ${seat} must provide both elimination time and reason`);
  if (!hasTime) return null;
  if (!isIntegerInRange(value, 0, INT32_MAX)) fail("invalid_elimination", `seat ${seat} has an invalid elimination time`);
  return { atSeconds: value, reason: requiredString(reason, "invalid_elimination", `seat ${seat} elimination reason`) };
};

/** Validate and normalize a newly saved V1 result using supplied roster data. */
export function validateMatchContract(payload, roster) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("invalid_payload", "match payload must be an object");
  if (!Array.isArray(payload.players) || payload.players.length < 2 || payload.players.length > 6) fail("invalid_participant_count", "a match requires between 2 and 6 players");
  const playerCount = payload.players.length;
  if (!isIntegerInRange(payload.startingSeat, 0, playerCount - 1)) fail("invalid_starting_seat", "startingSeat must identify a participant seat");
  if (!isIntegerInRange(payload.durationSeconds, 0, INT32_MAX)) fail("invalid_duration", "durationSeconds must be a non-negative integer");
  if (!isIntegerInRange(payload.turnCount, 0, INT16_MAX)) fail("invalid_turn_count", "turnCount must be a non-negative integer");
  if (!isIntegerInRange(payload.startingLife, 1, INT16_MAX)) fail("invalid_starting_life", "startingLife must be a positive integer");
  if (typeof payload.wentInfinite !== "boolean") fail("invalid_went_infinite", "wentInfinite must be a boolean");
  const winCondition = requiredString(payload.winCondition, "invalid_win_condition", "winCondition");

  const playerById = new Map((roster?.players ?? []).map((player) => [player.id, player]));
  const deckById = new Map((roster?.decks ?? []).map((deck) => [deck.id, deck]));
  const participantIds = new Set();
  const positivePlacements = new Set();
  let winnerCount = 0;
  const players = payload.players.map((raw, seat) => {
    if (!raw || typeof raw !== "object") fail("invalid_participant", `seat ${seat} must contain a participant`);
    const playerId = requiredString(raw.playerId, "invalid_player", `seat ${seat} playerId`);
    const deckId = requiredString(raw.deckId, "invalid_deck", `seat ${seat} deckId`);
    if (participantIds.has(playerId)) fail("duplicate_player", "a roster player may only occupy one seat");
    participantIds.add(playerId);
    const player = playerById.get(playerId);
    if (!player) fail("player_not_found", `seat ${seat} player does not exist`);
    const deck = deckById.get(deckId);
    if (!deck) fail("deck_not_found", `seat ${seat} deck does not exist`);
    if (deck.playerId !== playerId) fail("deck_player_mismatch", `seat ${seat} deck does not belong to its player`);
    if (typeof raw.isWinner !== "boolean") fail("invalid_winner", `seat ${seat} isWinner must be a boolean`);
    if (!isIntegerInRange(raw.placement, 0, playerCount)) fail("invalid_placement", `seat ${seat} has an invalid placement`);
    if (!isIntegerInRange(raw.finalLife, INT16_MIN, INT16_MAX)) fail("invalid_life", `seat ${seat} has an invalid final life`);
    if (!isIntegerInRange(raw.poisonReceived, 0, INT16_MAX)) fail("invalid_poison", `seat ${seat} has an invalid poison total`);
    if (!isIntegerInRange(raw.mulligans, 0, INT16_MAX)) fail("invalid_mulligans", `seat ${seat} has an invalid mulligan total`);
    if (!isIntegerInRange(raw.lifeGained, 0, INT16_MAX)) fail("invalid_life_gained", `seat ${seat} has an invalid life gained total`);
    const hasTime = raw.eliminatedAtSeconds !== null && raw.eliminatedAtSeconds !== undefined;
    const hasReason = raw.eliminationReason !== null && raw.eliminationReason !== undefined && raw.eliminationReason !== "";
    if (hasTime !== hasReason) fail("invalid_elimination", `seat ${seat} must provide both elimination time and reason`);
    const elimination = !hasTime ? null : {
      atSeconds: isIntegerInRange(raw.eliminatedAtSeconds, 0, INT32_MAX) ? raw.eliminatedAtSeconds : fail("invalid_elimination", `seat ${seat} has an invalid elimination time`),
      reason: requiredString(raw.eliminationReason, "invalid_elimination", `seat ${seat} elimination reason`),
    };
    if (raw.isWinner) {
      winnerCount += 1;
      if (raw.placement !== 1) fail("invalid_winner_placement", "the winner must have placement 1");
      if (elimination) fail("invalid_winner_elimination", "the winner cannot have an elimination record");
    } else if (!elimination && raw.placement !== 0) fail("unknown_placement", "a non-eliminated non-winner must have placement 0");
    if (raw.placement > 0) {
      if (positivePlacements.has(raw.placement)) fail("duplicate_placement", "positive placements must be unique");
      positivePlacements.add(raw.placement);
    }
    return { seat, playerId, deckId, playerName: player.name, deckName: deck.name, isWinner: raw.isWinner, placement: raw.placement, finalLife: raw.finalLife, poisonReceived: raw.poisonReceived, mulligans: raw.mulligans, lifeGained: raw.lifeGained, eliminatedAtSeconds: elimination?.atSeconds ?? null, eliminationReason: elimination?.reason ?? null };
  });
  if (winnerCount !== 1) fail("invalid_winner_count", "a V1 match must have exactly one winner");
  const nonWinners = players.filter((player) => !player.isWinner);
  const eliminationCompletion = nonWinners.every((player) => player.eliminatedAtSeconds !== null);
  if (eliminationCompletion && nonWinners.some((player) => player.placement === 0)) fail("missing_placement", "elimination completion requires placements for every non-winner");
  if (!Array.isArray(payload.damage)) fail("invalid_damage", "damage must be an array");
  const damageKeys = new Set();
  const damage = payload.damage.map((raw) => {
    if (!raw || typeof raw !== "object") fail("invalid_damage", "each damage entry must be an object");
    if (!isIntegerInRange(raw.sourceSeat, 0, playerCount - 1) || !isIntegerInRange(raw.targetSeat, 0, playerCount - 1)) fail("invalid_damage_seat", "damage seats must identify participants");
    if (!DAMAGE_TYPE_CODES.includes(raw.damageType)) fail("invalid_damage_type", "damageType is not supported");
    if (!isIntegerInRange(raw.amount, 1, INT16_MAX)) fail("invalid_damage_amount", "damage amount must be a positive integer");
    const key = `${raw.sourceSeat}:${raw.targetSeat}:${raw.damageType}`;
    if (damageKeys.has(key)) fail("duplicate_damage", "damage matrix entries must be unique");
    damageKeys.add(key);
    return { sourceSeat: raw.sourceSeat, targetSeat: raw.targetSeat, damageType: raw.damageType, amount: raw.amount };
  });
  return { match: { durationSeconds: payload.durationSeconds, winCondition, wentInfinite: payload.wentInfinite, turnCount: payload.turnCount, startingLife: payload.startingLife, startingSeat: payload.startingSeat, playerCount }, players, damage, completion: eliminationCompletion ? "elimination" : "declared_winner" };
}
