import type { Config } from "@netlify/functions";
import { inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { decks, matches, matchPlayers, matchDamage, players } from "../../db/schema.js";
import { runAtomic } from "../../db/atomic.js";
import { uuidv7 } from "../../db/ids.js";
import { TAG, cachedJson, uncachedJson, purgeTags } from "../lib/cache.js";
import { MatchContractError, validateMatchContract } from "../lib/match-contract.js";

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

  const suppliedPlayers = Array.isArray(payload?.players) ? payload.players : [];
  const playerIds = [...new Set(suppliedPlayers.map((player: any) => player?.playerId).filter((id: unknown): id is string => typeof id === "string" && id.length > 0))];
  const deckIds = [...new Set(suppliedPlayers.map((player: any) => player?.deckId).filter((id: unknown): id is string => typeof id === "string" && id.length > 0))];
  const [rosterPlayers, rosterDecks] = await Promise.all([
    playerIds.length > 0 ? db.select({ id: players.id, name: players.name }).from(players).where(inArray(players.id, playerIds)) : [],
    deckIds.length > 0 ? db.select({ id: decks.id, playerId: decks.playerId, name: decks.name }).from(decks).where(inArray(decks.id, deckIds)) : [],
  ]);

  let contract: ReturnType<typeof validateMatchContract>;
  try {
    contract = validateMatchContract(payload, { players: rosterPlayers, decks: rosterDecks });
  } catch (err) {
    if (err instanceof MatchContractError) {
      return uncachedJson({ error: err.message, code: err.code }, 422);
    }
    throw err;
  }

  // Generated here rather than by the database default, so all three inserts
  // are known up front and can go out as one batched round trip.
  const matchId = uuidv7();

  const matchRow = {
    id: matchId,
    ...contract.match,
  };

  const playerRows = contract.players.map((p: any) => ({
    id: uuidv7(),
    matchId,
    ...p,
  }));

  const damageRows = contract.damage.map((damage) => ({ matchId, ...damage }));

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
        'startingSeat', m.starting_seat,
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
             m.went_infinite, m.turn_count, m.starting_life, m.starting_seat, m.player_count,
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
