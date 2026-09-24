# GTAV Collectors Map

Interactive GTA V collectors map, architected in the spirit of [RDR2CollectorsMap](https://github.com/jeanropke/RDR2CollectorsMap), but backed by OutlawDB (Mongo).

## Project status

This is the initial bootstrap repo in the `outlawdb` org.

- Server-rendered API for map points (`/api/collectibles`)
- Category/cycle filtering
- Leaflet map + sidebar list
- OutlawDB integration via `DB_STRING`

## Architecture

- `public/`: static map client (Leaflet + sidebar workflow)
- `src/server.ts`: API + static hosting
- `src/db.ts`: OutlawDB connection and indexes
- `scripts/seed.ts`: initial GTA V seed data

The data contract is intentionally compatible with cross-game expansion (`game: "gta5"` now, `gta6` later) so a second repo can publish into the same OutlawDB cluster.

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm seed
pnpm dev
```

Open: `http://localhost:8787`

## Environment

- `DB_STRING` (required): Mongo connection string
- `MONGODB_DB` (optional): defaults to `outlawdb`
- `PORT` (optional): defaults to `8787`

## Next steps

1. Replace bootstrap seed with full GTA V collectible datasets.
2. Add tile layer strategy (official/custom layers) closer to RDR2CollectorsMap UX.
3. Add route planning, hide/show category toggles, and per-user progress sync.
4. Create sibling repo: `gtavi-collectorsmap` with same contract and separate ingest flow.
