import "dotenv/config";
import { collectibles, ensureIndexes } from "../src/db.js";
import type { Collectible } from "../src/types.js";

const seedRows: Collectible[] = [
  {
    game: "gta5",
    slug: "signal-jammer-ls-river-01",
    name: "Signal Jammer — LS River",
    category: "signal_jammer",
    cycle: 1,
    payout: 2000,
    status: "available",
    coords: { x: -118.244, y: 34.053 },
    source: { kind: "community", ref: "bootstrap" },
    updatedAt: new Date(),
  },
  {
    game: "gta5",
    slug: "playing-card-casino-roof-01",
    name: "Playing Card — Casino Roof",
    category: "playing_card",
    cycle: 2,
    payout: 250,
    status: "available",
    coords: { x: -118.384, y: 34.102 },
    source: { kind: "community", ref: "bootstrap" },
    updatedAt: new Date(),
  },
  {
    game: "gta5",
    slug: "action-figure-vespucci-pier-01",
    name: "Action Figure — Vespucci Pier",
    category: "action_figure",
    cycle: 1,
    payout: 1000,
    status: "available",
    coords: { x: -118.496, y: 33.986 },
    source: { kind: "community", ref: "bootstrap" },
    updatedAt: new Date(),
  },
  {
    game: "gta5",
    slug: "movie-prop-richman-01",
    name: "Movie Prop — Richman Estate",
    category: "movie_prop",
    cycle: 3,
    payout: 1500,
    status: "limited",
    coords: { x: -118.412, y: 34.078 },
    source: { kind: "community", ref: "bootstrap" },
    updatedAt: new Date(),
  },
];

async function main(): Promise<void> {
  await ensureIndexes();

  for (const row of seedRows) {
    await collectibles.updateOne(
      { game: row.game, slug: row.slug },
      { $set: row },
      { upsert: true },
    );
  }

  console.log(`Seeded ${seedRows.length} GTA V collectibles`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
