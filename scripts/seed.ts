import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectibles, ensureIndexes } from "../src/db.js";
import type { Collectible } from "../src/types.js";

type RawLocation = {
  id: number;
  type: string;
  title: string;
  lat: number;
  lng: number;
  notes?: string;
  order?: number;
  video?: { yt_id: string; yt_user?: string; start?: string; end?: string };
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function loadRows(): Collectible[] {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const raw = readFileSync(path.join(root, "data", "gtav-locations.json"), "utf8");
  const rows = JSON.parse(raw) as RawLocation[];

  const used = new Set<string>();
  return rows.map((row) => {
    const baseSlug = slugify(row.title || `${row.type}-${row.id}`);
    let slug = baseSlug;
    if (used.has(slug)) slug = `${slug}-${row.id}`;
    used.add(slug);

    return {
      game: "gta5",
      slug,
      name: row.title,
      category: slugify(row.type).replaceAll("-", "_"),
      setLabel: row.type,
      cycle: 1,
      payout: 0,
      order: row.order,
      notes: row.notes,
      video: row.video,
      status: "available",
      coords: { x: Number(row.lng), y: Number(row.lat) },
      source: { kind: "community", ref: "github.com/danharper/GTAV (WTFPL)" },
      updatedAt: new Date(),
    } satisfies Collectible;
  });
}

async function main(): Promise<void> {
  const seedRows = loadRows();
  await ensureIndexes();

  for (const row of seedRows) {
    await collectibles.updateOne({ game: row.game, slug: row.slug }, { $set: row }, { upsert: true });
  }

  console.log(`Seeded ${seedRows.length} GTA V collectibles`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
