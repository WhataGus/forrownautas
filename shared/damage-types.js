/** Shared persisted damage-type codes. */
export const DAMAGE_TYPE = Object.freeze({
  COMBAT: 0,
  COMMANDER: 1,
  INFECT: 2,
  NONCOMBAT: 3,
});

export const DAMAGE_TYPE_CODES = Object.freeze(Object.values(DAMAGE_TYPE));
