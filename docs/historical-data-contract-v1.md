# FORROWNAUTAS V1 Historical Data Contract

New V1 saves require 2–6 roster-backed participants. Every participant must
provide an existing player and a deck owned by that player. The API resolves and
stores player/deck snapshot names from the roster; client snapshot text is not
authoritative for new rows. Older rows with nullable references remain readable.

`matches.starting_seat` is nullable only for history saved before this contract.
New saves require an in-range starting seat. The prototype records it separately
from active-turn state, and the domain derives it from immutable starting-player
state.

Normal saved V1 results have exactly one winner with placement 1. There are two
completion shapes:

- **Elimination completion:** every non-winner has paired elimination time and
  reason, with a known positive placement.
- **Declared winner completion:** a combo, alternate condition, or infinite
  result may leave non-winners without elimination records. Those participants
  store placement `0`, meaning unknown/unassigned; no fake rank or elimination
  time is inferred.

The existing statistics query already excludes `placement = 0` from average
placement through `avg(nullif(placement, 0))`. Matches with unknown placement
still count for games, wins, damage, poison, mulligans, life gained, duration,
and other unrelated aggregates.

Damage remains a compact seat-based matrix. Both seats must exist, type must be
one of the shared persisted codes, amount must be positive, and each matrix key
must be unique. Source and target may be the same seat.

The API rejects malformed values rather than coercing/clamping them, validates
before the existing atomic write, and returns `{ error, code }` with HTTP 422
for contract failures. It does not recalculate Commander game rules.

The starting-seat migration is additive and nullable. It must not be executed
against a remote database without separate authorization.
