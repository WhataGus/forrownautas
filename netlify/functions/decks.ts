import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { decks } from "../../db/schema.js";
import { uuidv7 } from "../../db/ids.js";
import { TAG, uncachedJson, purgeTags } from "../lib/cache.js";

export default async (req: Request) => {
  if (req.method === "POST") {
    const { playerId, name } = await req.json();
    if (!playerId || !name || !name.trim()) {
      return uncachedJson({ error: "playerId and name are required" }, 400);
    }

    try {
      const deck = { id: uuidv7(), playerId, name: name.trim() };
      await db.insert(decks).values(deck);
      await purgeTags([TAG.ROSTER]);
      return uncachedJson({ id: deck.id, name: deck.name }, 201);
    } catch (err) {
      return uncachedJson({ error: "could not save deck, player may not exist" }, 400);
    }
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return uncachedJson({ error: "id is required" }, 400);
    await db.delete(decks).where(eq(decks.id, id));
    await purgeTags([TAG.ROSTER]);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  return uncachedJson({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/decks",
};
