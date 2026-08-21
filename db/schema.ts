import { pgTable, uuid, text, integer, smallint, boolean, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Damage type codes. Stored as smallint (2 bytes) rather than text so the
 * damage matrix stays compact — see DAMAGE_TYPE in db/constants.ts.
 */

export const players = pgTable("players", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  name: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const decks = pgTable("decks", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  name: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("decks_player_id_idx").on(t.playerId),
]);

export const matches = pgTable("matches", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  durationSeconds: integer("duration_seconds").notNull(),
  winCondition: text("win_condition"),
  wentInfinite: boolean("went_infinite").default(false),
  turnCount: smallint("turn_count").notNull().default(0),
  startingLife: smallint("starting_life").notNull().default(40),
  // Null only for historical matches saved before starting-player persistence.
  startingSeat: smallint("starting_seat"),
  playerCount: smallint("player_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("matches_created_at_idx").on(t.createdAt.desc()),
]);

export const matchPlayers = pgTable("match_players", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  // Seat position within the match (0-based). This is the join key used by
  // match_damage, which lets that table store 2-byte seats instead of 16-byte UUIDs.
  seat: smallint().notNull().default(0),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
  deckId: uuid("deck_id").references(() => decks.id, { onDelete: "set null" }),
  // Names are snapshotted so history survives a rename or a roster deletion,
  // and so guests who are not in the roster still record correctly.
  playerName: text("player_name").notNull(),
  deckName: text("deck_name").notNull(),
  isWinner: boolean("is_winner").default(false),
  placement: smallint().notNull().default(0),
  finalLife: smallint("final_life").notNull().default(0),
  poisonReceived: smallint("poison_received").notNull().default(0),
  mulligans: smallint().notNull().default(0),
  lifeGained: smallint("life_gained").notNull().default(0),
  eliminatedAtSeconds: integer("eliminated_at_seconds"),
  eliminationReason: text("elimination_reason"),
}, (t) => [
  index("match_players_match_id_idx").on(t.matchId),
  index("match_players_player_id_idx").on(t.playerId),
]);

/**
 * Per-pair damage matrix, one row per (match, attacker seat, victim seat, type)
 * with a non-zero amount.
 *
 * Compact encoding: seats are smallints scoped to the match rather than UUID
 * foreign keys, and the damage type is a smallint code rather than text. That
 * takes the row from ~104 bytes to ~36. The composite primary key also doubles
 * as the match_id lookup index, so no second index is needed.
 */
export const matchDamage = pgTable("match_damage", {
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  sourceSeat: smallint("source_seat").notNull(),
  targetSeat: smallint("target_seat").notNull(),
  damageType: smallint("damage_type").notNull(),
  amount: smallint().notNull(),
}, (t) => [
  primaryKey({ columns: [t.matchId, t.sourceSeat, t.targetSeat, t.damageType] }),
]);
