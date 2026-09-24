# GTAV Collectors Map

Interactive GTA V collectors map, architected in the spirit of [RDR2CollectorsMap](https://github.com/jeanropke/RDR2CollectorsMap), but backed by OutlawDB (Mongo).

## Project status

This is the initial bootstrap repo in the `outlawdb` org.

- Server-rendered API for map points (`/api/collectibles`) and category counts
- RDR2-style client pipeline (`loader.js` + map module + layer registry)
- GTA V tile-style switching (Road / Atlas / Satellite)
- Full `danharper/GTAV` locations dataset (276 rows)
- Leaflet map in game-world coordinates (custom `CRS.Simple` transform)
- OutlawDB integration via `DB_STRING`

## Architecture

- `public/`: static map client (Leaflet + sidebar workflow)
  - `public/js/loader.js`: startup data loader
  - `public/js/map.js`: map boot + CRS + tiles + markers
  - `public/js/layers.js`: style/category option rendering
- `src/server.ts`: API + static hosting
- `src/db.ts`: OutlawDB connection and indexes
- `scripts/seed.ts`: initial GTA V seed data
  - now seeds the full `data/gtav-locations.json`

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
- `MAP_TILES_ROAD` (optional)
- `MAP_TILES_ATLAS` (optional)
- `MAP_TILES_SATELLITE` (optional)

## Tile sources and references

The GTA V tile and coordinate approach follows projects that already solved this:

- `jeanropke/RDR2CollectorsMap` (architecture pattern)
- `danharper/GTAV` (legacy data + collectible map flow)
- `RiceaRaul/gta-v-map-leaflet` (transform constants / CRS behavior)
- `CreepPork/GTAV-Maps` (MIT map tile sets)

## Next steps

1. Replace bootstrap seed with full GTA V collectible datasets.
2. Move tile hosting from public CDN defaults to OutlawDB bucket URLs.
3. Add route planning, hide/show category toggles, and per-user progress sync.
4. Create sibling repo: `gtavi-collectorsmap` with same contract and separate ingest flow.
