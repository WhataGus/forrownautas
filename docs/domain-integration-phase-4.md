# Phase 4 domain integration

The legacy Babel frontend now uses the canonical domain through a temporary ESM
bridge for the damage matrix and immutable starting participant. `players` still
contains a display projection of commander damage, but persistence rows are
always generated from the domain matrix. No legacy damage accumulator fallback
exists.

`game/browser-adapter.js` is intentionally an interop bridge only. The future
Vite/TypeScript migration must import `game/domain.js` directly and remove the
window bridge and projection layer.

`game/save-flow.js` is production code, used by the UI and tests. Only a valid
2xx JSON response containing a match id permits reset. API failures, malformed
success responses, and network errors preserve the completed match for retry.

No database-backed end-to-end save test was run because the Phase 3 starting-seat
migration has not been authorized for execution. That verification remains
deferred to deployment/migration work.
