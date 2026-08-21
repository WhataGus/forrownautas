import { db } from "./index.js";

/**
 * Run several statements as one atomic unit, using the cheapest mechanism the
 * active driver supports.
 *
 * On the default serverless (HTTP) driver, `db.batch()` sends every statement
 * to Neon in a *single* HTTPS request wrapped in one non-interactive Postgres
 * transaction. That is both the atomicity fix and the cost fix: a match write
 * costs one round trip instead of one per insert.
 *
 * If NETLIFY_DB_DRIVER=server is set, drizzle returns a node-postgres database
 * which has no `batch()` but does support interactive transactions, so we fall
 * back to that.
 *
 * `build` receives the handle to build statements against, because drizzle
 * query builders bind to the session they were created from.
 */
export async function runAtomic<T>(build: (handle: any) => T[]): Promise<void> {
  const handle = db as any;

  if (typeof handle.batch === "function") {
    const statements = build(handle);
    if (statements.length === 0) return;
    await handle.batch(statements as any);
    return;
  }

  await handle.transaction(async (tx: any) => {
    for (const statement of build(tx)) {
      await statement;
    }
  });
}
