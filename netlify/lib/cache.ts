import { purgeCache } from "@netlify/functions";

/**
 * Cache tags. Every cacheable GET is tagged, and every write purges the tags it
 * affects, so responses can be cached indefinitely instead of on a timer.
 */
export const TAG = {
  ROSTER: "roster",
  MATCHES: "matches",
  STATS: "stats",
} as const;

/**
 * A JSON response that Netlify's CDN caches until explicitly purged.
 *
 * This is the main lever on database cost. Reads are served from the edge, so
 * Postgres is queried once per *change* rather than once per page view — a pod
 * checking stats all evening after one game costs a single query, not dozens.
 *
 * - `durable` uses Netlify's Durable Cache, shared across edge nodes. Without
 *   it each node misses independently and hits the database.
 * - `s-maxage` is a year because correctness comes from tag purging, not expiry.
 * - `stale-while-revalidate` keeps serving the old copy during a revalidation.
 * - Browser `Cache-Control` is `max-age=0, must-revalidate`, so clients always
 *   check with the CDN (cheap, no database) and see new results immediately
 *   after a purge instead of sitting on a stale local copy.
 */
export function cachedJson(body: unknown, tags: string[], status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=31536000, stale-while-revalidate=60",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Cache-Tag": tags.join(","),
    },
  });
}

/** A response that must never be cached (writes, errors). */
export function uncachedJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Invalidate cached reads after a write.
 *
 * Deliberately non-fatal: the write already committed, so a purge failure
 * should not turn a successful match save into an error for the user. Worst
 * case the dashboard is briefly stale.
 */
export async function purgeTags(tags: string[]): Promise<void> {
  try {
    await purgeCache({ tags });
  } catch (err) {
    console.warn("cache purge failed", err);
  }
}
