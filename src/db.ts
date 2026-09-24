import { MongoClient, type Collection } from "mongodb";
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Collectible } from "./types.js";

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

function loadDemoRows(): Collectible[] {
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
      // GTAV map-space lat/lng from the original dataset (not in-game world metres).
      coords: { x: Number(row.lng), y: Number(row.lat) },
      source: { kind: "community", ref: "github.com/danharper/GTAV (WTFPL)" },
      updatedAt: new Date(),
    } satisfies Collectible;
  });
}

const DEMO_ROWS: Collectible[] = loadDemoRows();

function applyFilter(rows: Collectible[], filter: Record<string, unknown>): Collectible[] {
  return rows.filter((row) => {
    if (filter.game && row.game !== filter.game) return false;
    const status = filter.status as { $ne?: string } | undefined;
    if (status?.$ne && row.status === status.$ne) return false;
    if (typeof filter.category === "string" && row.category !== filter.category) return false;
    if (typeof filter.cycle === "number" && row.cycle !== filter.cycle) return false;
    const name = filter.name as { $regex?: string; $options?: string } | undefined;
    if (name?.$regex) {
      const regex = new RegExp(name.$regex, name.$options ?? "");
      if (!regex.test(row.name)) return false;
    }
    return true;
  });
}

function demoCollection(): Collection<Collectible> {
  return {
    createIndexes: async () => [],
    countDocuments: async (filter: Record<string, unknown>) => applyFilter(DEMO_ROWS, filter).length,
    distinct: async (field: keyof Collectible, filter: Record<string, unknown>) =>
      [...new Set(applyFilter(DEMO_ROWS, filter).map((row) => row[field]))],
    updateOne: async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }),
    find: (filter: Record<string, unknown>, _options?: Record<string, unknown>) => {
      let rows = applyFilter(DEMO_ROWS, filter);
      return {
        toArray: async () => rows,
        sort: (spec: Record<string, 1 | -1>) => {
          const [field, direction] = Object.entries(spec)[0] ?? ["name", 1];
          rows = [...rows].sort((a, b) => {
            const av = String((a as Record<string, unknown>)[field] ?? "");
            const bv = String((b as Record<string, unknown>)[field] ?? "");
            return direction === 1 ? av.localeCompare(bv) : bv.localeCompare(av);
          });
          return { toArray: async () => rows };
        },
      };
    },
  } as unknown as Collection<Collectible>;
}

export const isDemoMode = !process.env.DB_STRING;

const cache = globalThis as typeof globalThis & { __gtavClient?: MongoClient };
const client = isDemoMode ? null : (cache.__gtavClient ??= new MongoClient(process.env.DB_STRING!, { maxPoolSize: 10 }));

const dbName = process.env.MONGODB_DB ?? "outlawdb";
export const db = client?.db(dbName) ?? null;
export const collectibles: Collection<Collectible> = db?.collection<Collectible>("collectibles") ?? demoCollection();

export async function ensureIndexes(): Promise<void> {
  await collectibles.createIndexes([
    { key: { game: 1, category: 1, cycle: 1 }, name: "game_category_cycle" },
    { key: { game: 1, slug: 1 }, unique: true, name: "game_slug_unique" },
    { key: { game: 1, status: 1 }, name: "game_status" },
  ]);
}
