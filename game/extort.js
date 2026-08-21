export function applyExtort(players, controllerId, amount) {
  const affectedOpponentIds = players
    .filter((player) => player.id !== controllerId && !player.isDead)
    .map((player) => player.id);
  const affectedOpponentIdSet = new Set(affectedOpponentIds);
  const controllerLifeGain = amount * affectedOpponentIds.length;

  return {
    players: players.map((player) => {
      if (affectedOpponentIdSet.has(player.id)) {
        return { ...player, life: player.life - amount };
      }
      if (player.id === controllerId && !player.isDead) {
        return { ...player, life: player.life + controllerLifeGain };
      }
      return player;
    }),
    affectedOpponentIds,
    affectedCount: affectedOpponentIds.length,
    controllerLifeGain,
  };
}
