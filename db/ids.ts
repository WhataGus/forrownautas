/**
 * UUIDv7 generator (time-ordered).
 *
 * Postgres 18 exposes uuidv7() natively and the schema uses it as the column
 * default, but IDs are generated here in the function instead so that every
 * statement in a match write is known up front and can go to the database as a
 * single batched round trip (see db/atomic.ts).
 *
 * v7 over v4 because the leading 48 bits are a millisecond timestamp, so keys
 * are ordered. Inserts land at the right edge of the btree instead of scattering
 * across it, which avoids page splits and index bloat as the table grows.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const ts = Date.now();
  bytes[0] = (ts / 2 ** 40) & 0xff;
  bytes[1] = (ts / 2 ** 32) & 0xff;
  bytes[2] = (ts / 2 ** 24) & 0xff;
  bytes[3] = (ts / 2 ** 16) & 0xff;
  bytes[4] = (ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
