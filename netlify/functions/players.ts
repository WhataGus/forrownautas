import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { players, decks } from "../../db/schema.js";
import { runAtomic } from "../../db/atomic.js";
import { uuidv7 } from "../../db/ids.js";
import { TAG, cachedJson, uncachedJson, purgeTags } from "../lib/cache.js";

export default async (req: Request) => {
  if (req.method === "GET") {
    const rows = await db
      .select({
        playerId: players.id,
        playerName: players.name,
        deckId: decks.id,
        deckName: decks.name,
      })
      .from(players)
      .leftJoin(decks, eq(decks.playerId, players.id))
      .orderBy(players.createdAt);

    const roster = new Map();
    for (const row of rows) {
      if (!roster.has(row.playerId)) {
        roster.set(row.playerId, { id: row.playerId, name: row.playerName, decks: [] });
      }
      if (row.deckId) {
        roster.get(row.playerId).decks.push({ id: row.deckId, name: row.deckName });
      }
    }

    // The roster changes only when someone is added or removed, so it is served
    // from the edge and purged on write rather than re-queried on every load.
    return cachedJson(Array.from(roster.values()), [TAG.ROSTER]);
  }

  if (req.method === "POST") {
    const { name, deckName } = await req.json();
    if (!name || !name.trim()) {
      return uncachedJson({ error: "name is required" }, 400);
    }

    const player = { id: uuidv7(), name: name.trim() };
    const deck = deckName && deckName.trim()
      ? { id: uuidv7(), playerId: player.id, name: deckName.trim() }
      : null;

    // Player and starting deck are inserted together: atomic, and one round trip.
    await runAtomic((handle) => {
      const statements = [handle.insert(players).values(player)];
      if (deck) statements.push(handle.insert(decks).values(deck));
      return statements;
    });

    await purgeTags([TAG.ROSTER]);
    return uncachedJson({
      id: player.id,
      name: player.name,
      decks: deck ? [{ id: deck.id, name: deck.name }] : [],
    }, 201);
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return uncachedJson({ error: "id is required" }, 400);
    await db.delete(players).where(eq(players.id, id));
    // Deleting a player nulls their player_id on past match rows, which changes
    // how those rows group in the stats aggregate, so stats is purged too.
    await purgeTags([TAG.ROSTER, TAG.STATS]);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  return uncachedJson({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/players",
};
