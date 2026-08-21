import type { Config } from "@netlify/functions";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { matches, matchPlayers, matchDamage } from "../../db/schema.js";
import { runAtomic } from "../../db/atomic.js";
import { uuidv7 } from "../../db/ids.js";
import { TAG, cachedJson, uncachedJson, purgeTags } from "../lib/cache.js";

const MAX_SEATS = 8;

/** Clamp to a column's range so a malformed client payload can't fail the insert. */
const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

/** For smallint columns (placement, life, poison, damage...). */
const int16 = (v: unknown, fallback = 0) => clamp(v, -32768, 32767, fallback);

/** For the integer columns: duration_seconds and eliminated_at_seconds. */
const int32 = (v: unknown, fallback = 0) => clamp(v, -2147483648, 2147483647, fallback);

export default async (req: Request) => {
  if (req.method === "GET") return getMatches(req);
  if (req.method === "POST") return createMatch(req);
  return uncachedJson({ error: "Method not allowed" }, 405);
};

async function createMatch(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return uncachedJson({ error: "invalid JSON body" }, 400);
  }

  const seats = Array.isArray(payload?.players) ? payload.players.slice(0, MAX_SEATS) : [];
  if (seats.length === 0) {
    return uncachedJson({ error: "at least one player is required" }, 400);
  }

  // Generated here rather than by the database default, so all three inserts
  // are known up front and can go out as one batched round trip.
  const matchId = uuidv7();

  const matchRow = {
    id: matchId,
    durationSeconds: int32(payload.durationSeconds, 0),
    winCondition: payload.winCondition ?? null,
    wentInfinite: !!payload.wentInfinite,
    turnCount: int16(payload.turnCount),
    startingLife: int16(payload.startingLife, 40),
    playerCount: seats.length,
  };

  const playerRows = seats.map((p: any, seat: number) => ({
    id: uuidv7(),
    matchId,
    seat,
    playerId: p?.playerId || null,
    deckId: p?.deckId || null,
    playerName: String(p?.playerName ?? "Unknown").slice(0, 120),
    deckName: String(p?.deckName ?? "Unknown").slice(0, 120),
    isWinner: !!p?.isWinner,
    placement: int16(p?.placement),
    finalLife: int16(p?.finalLife),
    poisonReceived: int16(p?.poisonReceived),
    mulligans: int16(p?.mulligans),
    lifeGained: int16(p?.lifeGained),
    eliminatedAtSeconds: p?.eliminatedAtSeconds == null ? null : int32(p.eliminatedAtSeconds),
    eliminationReason: p?.eliminationReason ?? null,
  }));

  // Compact damage matrix. Only non-zero pairs are stored, and the last write
  // for a given (source, target, type) wins so a duplicated client entry can't
  // violate the composite primary key.
  const damageByKey = new Map<string, { sourceSeat: number; targetSeat: number; damageType: number; amount: number }>();
  for (const d of Array.isArray(payload?.damage) ? payload.damage : []) {
    const sourceSeat = int16(d?.sourceSeat, -1);
    const targetSeat = int16(d?.targetSeat, -1);
    const damageType = int16(d?.damageType, -1);
    const amount = int16(d?.amount);
    const seatOk = (s: number) => s >= 0 && s < seats.length;
    if (!seatOk(sourceSeat) || !seatOk(targetSeat) || damageType < 0 || amount === 0) continue;
    damageByKey.set(`${sourceSeat}:${targetSeat}:${damageType}`, { sourceSeat, targetSeat, damageType, amount });
  }
  const damageRows = Array.from(damageByKey.values(), (d) => ({ matchId, ...d }));

  try {
    await runAtomic((handle) => {
      const statements = [
        handle.insert(matches).values(matchRow),
        handle.insert(matchPlayers).values(playerRows),
      ];
      if (damageRows.length > 0) {
        statements.push(handle.insert(matchDamage).values(damageRows));
      }
      return statements;
    });
  } catch (err) {
    console.error("failed to record match", err);
    return uncachedJson({ error: "could not record match" }, 500);
  }

  await purgeTags([TAG.MATCHES, TAG.STATS]);
  return uncachedJson({ id: matchId }, 201);
}

async function getMatches(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    // Full detail for one match, including its damage matrix, in one round trip.
    const result: any = await db.execute(sql`
      SELECT json_build_object(
        'id', m.id,
        'createdAt', m.created_at,
        'durationSeconds', m.duration_seconds,
        'winCondition', m.win_condition,
        'wentInfinite', m.went_infinite,
        'turnCount', m.turn_count,
        'startingLife', m.starting_life,
        'playerCount', m.player_count,
        'players', coalesce((
          SELECT json_agg(json_build_object(
            'seat', mp.seat,
            'playerId', mp.player_id,
            'playerName', mp.player_name,
            'deckName', mp.deck_name,
            'isWinner', mp.is_winner,
            'placement', mp.placement,
            'finalLife', mp.final_life,
            'poisonReceived', mp.poison_received,
            'mulligans', mp.mulligans,
            'lifeGained', mp.life_gained,
            'eliminatedAtSeconds', mp.eliminated_at_seconds,
            'eliminationReason', mp.elimination_reason
          ) ORDER BY mp.seat)
          FROM match_players mp WHERE mp.match_id = m.id
        ), '[]'::json),
        'damage', coalesce((
          SELECT json_agg(json_build_object(
            'sourceSeat', md.source_seat,
            'targetSeat', md.target_seat,
            'damageType', md.damage_type,
            'amount', md.amount
          ))
          FROM match_damage md WHERE md.match_id = m.id
        ), '[]'::json)
      ) AS payload
      FROM matches m
      WHERE m.id = ${id}
    `);

    const detail = (result?.rows ?? result)?.[0]?.payload;
    if (!detail) return uncachedJson({ error: "match not found" }, 404);
    return cachedJson(detail, [TAG.MATCHES]);
  }

  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  // History list. The damage matrix is deliberately left out — the list view does
  // not render it, and including it would multiply the payload for no benefit.
  const result: any = await db.execute(sql`
    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at DESC NULLS LAST), '[]'::json) AS payload
    FROM (
      SELECT m.id, m.created_at, m.duration_seconds, m.win_condition,
             m.went_infinite, m.turn_count, m.starting_life, m.player_count,
             coalesce((
               SELECT json_agg(json_build_object(
                 'seat', mp.seat,
                 'playerName', mp.player_name,
                 'deckName', mp.deck_name,
                 'isWinner', mp.is_winner,
                 'placement', mp.placement
               ) ORDER BY mp.placement, mp.seat)
               FROM match_players mp WHERE mp.match_id = m.id
             ), '[]'::json) AS players
      FROM matches m
      ORDER BY m.created_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    ) t
  `);

  return cachedJson((result?.rows ?? result)?.[0]?.payload ?? [], [TAG.MATCHES]);
}

export const config: Config = {
  path: "/api/matches",
};
