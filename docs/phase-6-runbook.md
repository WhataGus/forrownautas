# Phase 6 full-stack runbook

## Development commands

`npm run dev` starts the Vite frontend only. Netlify Functions and `/api/*`
routes are not available in this mode.

`npm run dev:fullstack` starts Netlify Dev, which orchestrates the Vite frontend
and the functions in `netlify/functions`.

Netlify Dev may create untracked local runtime state under `.netlify/`, including
an ephemeral local database when no remote database credentials are configured.
That state is ignored by Git and does not identify or authorize any remote
database or linked Netlify site.

## Database state and pre-launch policy

Phase 6A configures no database credentials. The database target remains
unknown, and the presence of `NETLIFY_DB_URL` alone is not proof that a target is
safe or belongs to FORROWNAUTAS.

FORROWNAUTAS has no valuable live data yet. After its identity, ownership,
environment, and schema state are positively verified, the database intended
for production may be explicitly approved for pre-launch validation. A separate
staging database is optional rather than mandatory. Synthetic test records may
be removed or reset before launch only through a separately approved operation.

Local credential files must remain untracked. `.env.example` documents variable
names only and contains no connection details or secrets.

## Migration warning

The new match backend requires `matches.starting_seat`. The migration at
`netlify/database/migrations/20260821130000_add_match_starting_seat/migration.sql`
remains unapplied. Do not deploy the new match GET/POST behavior before the
identified database contains this column.

The existing migration history also changes UUID defaults to `uuidv7()` without
defining that function. Phase 6B must determine whether the intended database
provides it, which PostgreSQL runtime/version is in use, whether the complete
migration history initializes an empty database, and whether a bootstrap step is
missing. Do not invent a UUID function or run these migrations before approval.

## Deployment warning

Netlify site linking, GitHub-to-Netlify integration, environment configuration,
migration, and deployment remain separately gated. `npm run dev:fullstack` must
not be treated as authorization to link, deploy, or connect to an unidentified
database.
