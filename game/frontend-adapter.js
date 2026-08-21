import { adjustDamage, commanderDamageAgainst, createMatch } from "./domain.js";

export function createFrontendMatch(legacyPlayers, startingSeat, startingLife) {
  const participants = legacyPlayers.map((player) => ({ id: player.id, playerId: player.userId, deckId: player.deckId, playerName: player.name, deckName: player.commander }));
  return createMatch({ players: participants, startingLife, startingPlayerId: participants[startingSeat]?.id ?? null });
}

export const applyTrackedDamage = (match, damage) => adjustDamage(match, damage);

export function projectCommanderDamage(match, legacyPlayers) {
  return legacyPlayers.map((player) => ({ ...player, commanderDamage: commanderDamageAgainst(match, player.id) }));
}

export function startingSeatOf(match) {
  return match.players.findIndex((player) => player.id === match.startingPlayerId);
}

export function damagePayloadFrom(match) {
  const seatOf = Object.fromEntries(match.players.map((player, seat) => [player.id, seat]));
  return Object.entries(match.damage).flatMap(([key, amount]) => {
    if (amount <= 0) return [];
    const [sourceId, targetId, damageType] = key.split("|");
    return [{ sourceSeat: seatOf[sourceId], targetSeat: seatOf[targetId], damageType: Number(damageType), amount }];
  });
}
