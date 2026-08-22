import { DAMAGE_TYPE, adjustDamage, commanderDamageAgainst, createMatch } from "./domain.js";

export function createFrontendMatch(legacyPlayers, startingSeat, startingLife) {
  const participants = legacyPlayers.map((player) => ({ id: player.id, playerId: player.userId, deckId: player.deckId, playerName: player.name, deckName: player.commander }));
  return createMatch({ players: participants, startingLife, startingPlayerId: participants[startingSeat]?.id ?? null });
}

export const applyTrackedDamage = (match, damage) => adjustDamage(match, damage);

export function applyFrontendDamage(match, legacyPlayers, action) {
  const damageType = action.isInfect
    ? DAMAGE_TYPE.INFECT
    : (action.selectedDamageType === "commander" ? DAMAGE_TYPE.COMMANDER : DAMAGE_TYPE.COMBAT);
  const nextMatch = applyTrackedDamage(match, {
    sourceId: action.sourceId,
    targetId: action.targetId,
    damageType,
    amount: action.amount,
  });
  const projectedPlayers = projectCommanderDamage(nextMatch, legacyPlayers).map((player) => {
    let life = player.life;
    let poison = player.poison;
    if (player.id === action.sourceId && action.isLifelink) life += action.amount;
    if (player.id === action.targetId) {
      if (damageType === DAMAGE_TYPE.INFECT) poison += action.amount;
      else life -= action.amount;
    }
    return { ...player, life, poison };
  });
  return { match: nextMatch, players: projectedPlayers, damageType };
}

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
