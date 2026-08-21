import type { Config } from "@netlify/functions";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { TAG, cachedJson } from "../lib/cache.js";

/**
 * Aggregate stats for the dashboard.
 *
 * Everything is computed in ONE statement and returned as a single JSON value.
 * Assembling leaderboards, deck performance, the rivalry matrix and win
 * conditions as separate queries would cost one HTTPS round trip each on the
 * serverless driver; as one statement it is a single trip, and the result is
 * then cached at the edge until a new match purges it.
 *
 * Players are keyed by roster id where present and by name otherwise, so guests
 * who were never added to the roster still aggregate correctly.
 */
const STATS_QUERY = sql`
WITH totals AS (
  SELECT
    count(*)::int                                        AS matches,
    coalesce(sum(duration_seconds), 0)::int              AS total_seconds,
    coalesce(round(avg(duration_seconds)), 0)::int       AS avg_seconds,
    coalesce(round(avg(nullif(turn_count, 0))), 0)::int  AS avg_turns,
    count(*) FILTER (WHERE went_infinite)::int           AS infinite_games
  FROM matches
),
seat AS (
  SELECT
    mp.*,
    coalesce(mp.player_id::text, 'guest:' || mp.player_name) AS player_key
  FROM match_players mp
),
pair AS (
  SELECT
    src.player_key   AS source_key,
    src.player_name  AS source_name,
    tgt.player_key   AS target_key,
    tgt.player_name  AS target_name,
    md.damage_type,
    sum(md.amount)::int AS amount
  FROM match_damage md
  JOIN seat src ON src.match_id = md.match_id AND src.seat = md.source_seat
  JOIN seat tgt ON tgt.match_id = md.match_id AND tgt.seat = md.target_seat
  GROUP BY 1, 2, 3, 4, 5
),
dealt AS (
  SELECT source_key AS player_key,
         sum(amount)::int AS total,
         sum(amount) FILTER (WHERE damage_type = 1)::int AS commander
  FROM pair GROUP BY 1
),
received AS (
  SELECT target_key AS player_key,
         sum(amount)::int AS total,
         sum(amount) FILTER (WHERE damage_type = 1)::int AS commander
  FROM pair GROUP BY 1
),
per_player AS (
  SELECT
    s.player_key,
    max(s.player_name)                                  AS name,
    count(*)::int                                       AS games,
    count(*) FILTER (WHERE s.is_winner)::int            AS wins,
    round(avg(nullif(s.placement, 0)), 2)               AS avg_placement,
    coalesce(sum(s.life_gained), 0)::int                AS life_gained,
    coalesce(sum(s.poison_received), 0)::int            AS poison_received,
    coalesce(sum(s.mulligans), 0)::int                  AS mulligans,
    coalesce(round(avg(s.final_life)), 0)::int          AS avg_final_life
  FROM seat s
  GROUP BY s.player_key
),
per_deck AS (
  SELECT
    s.deck_name,
    max(s.player_name)                       AS player_name,
    count(*)::int                            AS games,
    count(*) FILTER (WHERE s.is_winner)::int AS wins
  FROM seat s
  GROUP BY s.deck_name
),
win_cons AS (
  SELECT coalesce(win_condition, 'Desconhecido') AS condition, count(*)::int AS count
  FROM matches GROUP BY 1
)
SELECT json_build_object(
  'totals', (SELECT to_json(t) FROM totals t),
  'players', coalesce((
    SELECT json_agg(json_build_object(
      'name', p.name,
      'games', p.games,
      'wins', p.wins,
      'winRate', round(p.wins::numeric * 100 / nullif(p.games, 0), 1),
      'avgPlacement', p.avg_placement,
      'avgFinalLife', p.avg_final_life,
      'lifeGained', p.life_gained,
      'poisonReceived', p.poison_received,
      'mulligans', p.mulligans,
      'damageDealt', coalesce(d.total, 0),
      'commanderDamageDealt', coalesce(d.commander, 0),
      'damageReceived', coalesce(r.total, 0),
      'commanderDamageReceived', coalesce(r.commander, 0)
    ) ORDER BY p.wins DESC, p.games DESC)
    FROM per_player p
    LEFT JOIN dealt d    ON d.player_key = p.player_key
    LEFT JOIN received r ON r.player_key = p.player_key
  ), '[]'::json),
  'decks', coalesce((
    SELECT json_agg(json_build_object(
      'deckName', k.deck_name,
      'playerName', k.player_name,
      'games', k.games,
      'wins', k.wins,
      'winRate', round(k.wins::numeric * 100 / nullif(k.games, 0), 1)
    ) ORDER BY k.wins DESC, k.games DESC)
    FROM per_deck k
  ), '[]'::json),
  'rivalries', coalesce((
    SELECT json_agg(json_build_object(
      'source', x.source_name,
      'target', x.target_name,
      'combat', x.combat,
      'commander', x.commander,
      'infect', x.infect,
      'noncombat', x.noncombat,
      'total', x.total
    ) ORDER BY x.total DESC)
    FROM (
      SELECT
        source_name, target_name,
        coalesce(sum(amount) FILTER (WHERE damage_type = 0), 0)::int AS combat,
        coalesce(sum(amount) FILTER (WHERE damage_type = 1), 0)::int AS commander,
        coalesce(sum(amount) FILTER (WHERE damage_type = 2), 0)::int AS infect,
        coalesce(sum(amount) FILTER (WHERE damage_type = 3), 0)::int AS noncombat,
        sum(amount)::int AS total
      FROM pair
      GROUP BY source_name, target_name
    ) x
  ), '[]'::json),
  'winConditions', coalesce((
    SELECT json_agg(json_build_object('condition', w.condition, 'count', w.count)
           ORDER BY w.count DESC)
    FROM win_cons w
  ), '[]'::json)
) AS payload
`;

export default async (req: Request) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const result: any = await db.execute(STATS_QUERY);
  const rows = result?.rows ?? result;
  const payload = rows?.[0]?.payload ?? null;

  return cachedJson(payload, [TAG.STATS, TAG.MATCHES]);
};

export const config: Config = {
  path: "/api/stats",
};
