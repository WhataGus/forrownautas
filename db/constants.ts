import { DAMAGE_TYPE } from "../shared/damage-types.js";

/**
 * Damage type codes stored in match_damage.damage_type.
 *
 * Kept as smallint codes rather than text: 2 bytes instead of ~10, on the
 * highest-volume table in the schema. The same codes are mirrored in the
 * front-end tracker in index.html — keep the two in sync.
 */
export { DAMAGE_TYPE };

export const DAMAGE_TYPE_NAME: Record<number, string> = {
  0: "combat",
  1: "commander",
  2: "infect",
  3: "noncombat",
};
