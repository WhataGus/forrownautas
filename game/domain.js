/**
 * Pure Commander match domain.
 *
 * This is the intended future canonical implementation of gameplay rules. It
 * deliberately has no React, DOM, network, or database dependencies. Phase 2
 * does not wire it into the legacy index.html prototype; a later migration
 * must do that so the project does not keep two gameplay implementations.
 */

export const DAMAGE_TYPE = Object.freeze({
  COMBAT: 0,
  COMMANDER: 1,
  INFECT: 2,
  NONCOMBAT: 3,
});

export const ELIMINATION_REASON = Object.freeze({
  LIFE: "Vida chegou a 0",
  POISON: "10 marcadores de Veneno",
  COMMANDER: "21 Dano de Comandante",
});

const FOUR_PLAYER_CLOCKWISE_SEATS = [0, 1, 3, 2];

const damageKey = (sourceId, targetId, damageType) => `${sourceId}|${targetId}|${damageType}`;

const updatePlayer = (state, playerId, update) => ({
  ...state,
  players: state.players.map((player) => player.id === playerId ? update(player) : player),
});

/** Create a new in-memory match using the configured starting life. */
export function createMatch({ players, startingLife = 40, startingPlayerId = null }) {
  const participantIds = new Set(players.map((player) => player.id));
  const activePlayerId = participantIds.has(startingPlayerId) ? startingPlayerId : null;

  return {
    startingLife,
    startingPlayerId: activePlayerId,
    activePlayerId,
    turnNumber: 1,
    players: players.map((player) => ({
      ...player,
      life: startingLife,
      poison: 0,
      mulligans: 0,
      lifeGained: 0,
      isEliminated: false,
    })),
    damage: {},
    eliminations: {},
  };
}

export function adjustLife(state, playerId, amount) {
  return updatePlayer(state, playerId, (player) => ({
    ...player,
    life: player.life + amount,
    lifeGained: player.lifeGained + (amount > 0 ? amount : 0),
  }));
}

export function adjustPoison(state, playerId, amount) {
  return updatePlayer(state, playerId, (player) => ({
    ...player,
    poison: Math.max(0, player.poison + amount),
  }));
}

export function adjustMulligans(state, playerId, amount) {
  return updatePlayer(state, playerId, (player) => ({
    ...player,
    mulligans: Math.max(0, player.mulligans + amount),
  }));
}

/**
 * Adjust a typed source-target damage total. Commander damage is derived from
 * this same matrix, rather than maintained in a separate persistence counter.
 */
export function adjustDamage(state, { sourceId, targetId, damageType, amount }) {
  if (!sourceId || !targetId || sourceId === targetId || !amount) return state;

  const key = damageKey(sourceId, targetId, damageType);
  const nextAmount = Math.max(0, (state.damage[key] ?? 0) + amount);
  const damage = { ...state.damage };
  if (nextAmount === 0) delete damage[key];
  else damage[key] = nextAmount;
  return { ...state, damage };
}

export function commanderDamageFrom(state, sourceId, targetId) {
  return state.damage[damageKey(sourceId, targetId, DAMAGE_TYPE.COMMANDER)] ?? 0;
}

export function commanderDamageAgainst(state, targetId) {
  return state.players.reduce((totals, player) => {
    const amount = commanderDamageFrom(state, player.id, targetId);
    if (amount > 0) totals[player.id] = amount;
    return totals;
  }, {});
}

/** Match the prototype's present eligibility priority: life, poison, commander. */
export function getEliminationEligibility(state, playerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.isEliminated) return null;
  if (player.life <= 0) return { playerId, reason: ELIMINATION_REASON.LIFE };
  if (player.poison >= 10) return { playerId, reason: ELIMINATION_REASON.POISON };

  const sourceId = state.players.find((source) => commanderDamageFrom(state, source.id, playerId) >= 21)?.id;
  return sourceId ? { playerId, reason: ELIMINATION_REASON.COMMANDER, sourceId } : null;
}

/** Confirm an already eligible elimination. Repeated confirmation is a no-op. */
export function confirmElimination(state, playerId, atSeconds) {
  const eligibility = getEliminationEligibility(state, playerId);
  if (!eligibility) return state;

  return {
    ...updatePlayer(state, playerId, (player) => ({ ...player, isEliminated: true })),
    eliminations: {
      ...state.eliminations,
      [playerId]: { atSeconds, reason: eligibility.reason },
    },
  };
}

/** Normal Commander completion is defined only when exactly one player lives. */
export function getMatchStatus(state) {
  const survivors = state.players.filter((player) => !player.isEliminated);
  if (survivors.length === 1) {
    return { status: "complete", winnerId: survivors[0].id };
  }
  return { status: "in_progress", winnerId: null };
}

/**
 * Preserve the prototype's deterministic normal-game placement convention:
 * winner first, then latest confirmed elimination first. A non-terminal game
 * intentionally has no derived placements.
 */
export function getNormalPlacements(state) {
  const { status, winnerId } = getMatchStatus(state);
  if (status !== "complete") return {};

  const placements = { [winnerId]: 1 };
  state.players
    .filter((player) => player.id !== winnerId)
    .sort((left, right) => state.eliminations[right.id].atSeconds - state.eliminations[left.id].atSeconds)
    .forEach((player, index) => { placements[player.id] = index + 2; });
  return placements;
}

/**
 * Characterize the existing four-quadrant turn mapping only. The legacy
 * prototype has no defined turn order for other player counts.
 */
export function advanceFourPlayerTurn(state) {
  if (state.players.length !== 4 || !state.activePlayerId) return state;
  const activeSeat = state.players.findIndex((player) => player.id === state.activePlayerId);
  const activeClockPosition = FOUR_PLAYER_CLOCKWISE_SEATS.indexOf(activeSeat);
  if (activeClockPosition === -1) return state;

  let nextClockPosition = activeClockPosition;
  for (let attempts = 0; attempts < FOUR_PLAYER_CLOCKWISE_SEATS.length; attempts += 1) {
    nextClockPosition = (nextClockPosition + 1) % FOUR_PLAYER_CLOCKWISE_SEATS.length;
    const nextSeat = FOUR_PLAYER_CLOCKWISE_SEATS[nextClockPosition];
    const nextPlayer = state.players[nextSeat];
    if (!nextPlayer.isEliminated) {
      return {
        ...state,
        activePlayerId: nextPlayer.id,
        turnNumber: state.turnNumber + (nextClockPosition === 0 ? 1 : 0),
      };
    }
  }
  return state;
}

/** Start another match with the same participants and configuration. */
export function resetMatch(state) {
  return createMatch({
    players: state.players.map(({ life, poison, mulligans, lifeGained, isEliminated, ...participant }) => participant),
    startingLife: state.startingLife,
    startingPlayerId: state.startingPlayerId,
  });
}

/** Transform canonical state into the existing POST /api/matches payload shape. */
export function buildMatchPayload(state, { durationSeconds, winCondition, wentInfinite = false }) {
  const placements = getNormalPlacements(state);
  const status = getMatchStatus(state);
  const seatOf = Object.fromEntries(state.players.map((player, seat) => [player.id, seat]));

  const damage = Object.entries(state.damage).map(([key, amount]) => {
    const [sourceId, targetId, damageType] = key.split("|");
    return {
      sourceSeat: seatOf[sourceId],
      targetSeat: seatOf[targetId],
      damageType: Number(damageType),
      amount,
    };
  });

  return {
    durationSeconds,
    winCondition,
    wentInfinite,
    turnCount: state.turnNumber,
    startingLife: state.startingLife,
    players: state.players.map((player) => ({
      playerId: player.playerId ?? null,
      deckId: player.deckId ?? null,
      playerName: player.playerName,
      deckName: player.deckName,
      isWinner: status.winnerId === player.id,
      placement: placements[player.id] ?? 0,
      finalLife: player.life,
      poisonReceived: player.poison,
      mulligans: player.mulligans,
      lifeGained: player.lifeGained,
      eliminatedAtSeconds: state.eliminations[player.id]?.atSeconds ?? null,
      eliminationReason: state.eliminations[player.id]?.reason ?? null,
    })),
    damage,
  };
}
