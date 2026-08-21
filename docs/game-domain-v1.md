# FORROWNAUTAS V1 Game Domain

## Purpose and transitional status

`game/domain.js` is the intended future canonical implementation of deterministic
Commander match rules. It is pure JavaScript so it can be tested without React,
the browser, Netlify, or PostgreSQL.

Phase 2 intentionally does **not** integrate this module with `index.html`. The
legacy prototype remains the live implementation until a later frontend phase
migrates it to consume this module. That migration is required: the project must
not indefinitely keep the prototype rules and this domain module as separate,
independent sources of truth.

## Current prototype behavior characterized

The prototype is implemented in `index.html` as one React component.

- Selected/random starting player sets `activePlayerIdx`; it is not persisted.
- Mulligans and poison clamp at zero. Life does not clamp and can become negative.
- Elimination eligibility is detected after a threshold crossing, in this order:
  life at/below zero, poison at/above ten, then 21 commander damage from one
  source. A modal requires confirmation before a player becomes dead.
- Confirmed elimination stores a time and reason in `matchStatsRef`.
- A match only presents an end-game action when one or fewer players live; it
  does not automatically transition. The user can also manually end a game.
- The current post-match screen allows editing winners, and payload placement is
  winners at 1 followed by reverse elimination time.
- The current payload combines display state with separate damage/life-gain
  accumulators. Thus manual commander-damage reductions can disagree with
  persisted damage. Mass effects also do not fully record historical damage.

## Canonical Phase 2 rules

- Matches have 2–6 participants by product scope; `createMatch` initializes all
  supplied participants at configured starting life (Commander default: 40).
- A selected starting participant initializes active-player state.
- Life may be positive, zero, or negative. Poison and mulligans may be reduced
  but not below zero.
- Commander damage is a typed source-target matrix. A target is eligible only
  when a single source has dealt at least 21 commander damage; values from
  separate sources are never added for that threshold.
- Eligibility and confirmation are distinct. Confirmed elimination is
  idempotent and records its original time/reason once.
- Normal completion exists only with exactly one surviving participant. That
  survivor is the normal winner. Zero survivors and other unusual outcomes are
  deliberately not resolved here.
- For a normal completed game with confirmed, distinct elimination times,
  placement is winner = 1, then latest elimination = 2, continuing backwards.
- The match-result transformation follows the existing `/api/matches` payload
  contract. It deliberately does not add starting-player persistence.

## Four-player turns only

The prototype's deterministic four-player visual order is seat indexes
`0 -> 1 -> 3 -> 2 -> 0`; eliminated seats are skipped. Phase 2 protects only
this behavior through `advanceFourPlayerTurn`.

No turn order is defined or tested for non-four-player games. The current visual
mapping is not validly specified for 2, 3, 5, or 6 players. Product/design must
resolve seating and turn order for those counts before a later phase integrates
or extends domain turn behavior.

## Open decisions and deferred work

The following are intentionally not invented by Phase 2:

- priority when life, poison, and commander thresholds happen simultaneously;
  the current prototype's life/poison/commander ordering is characterized only;
- simultaneous draws, zero survivors, multiple winners, and manual early end;
- placement ties or players lacking a confirmed elimination;
- concede/manual elimination reason and UI;
- starting-player database persistence;
- poison control accessibility in the legacy UI;
- save failure handling;
- setup validation for duplicate players and deck ownership;
- recording mass-effect/noncombat history consistently.

## Integration requirement for a later phase

Before the frontend is substantially extended, move its game state, transitions,
and payload construction to this tested domain module (or its TypeScript
successor with equivalent tests). At that point, remove duplicate rule logic from
`index.html`; do not keep parallel gameplay implementations.
