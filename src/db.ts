import { MongoClient } from "mongodb";
import "dotenv/config";
import type { Collectible } from "./types.js";

function connectionString(): string {
  const value = process.env.DB_STRING;
  if (!value) throw new Error("DB_STRING is not set.");
  return value;
}

const cache = globalThis as typeof globalThis & { __gtavClient?: MongoClient };
const client = (cache.__gtavClient ??= new MongoClient(connectionString(), { maxPoolSize: 10 }));

const dbName = process.env.MONGODB_DB ?? "outlawdb";

export const db = client.db(dbName);
export const collectibles = db.collection<Collectible>("collectibles");

export async function ensureIndexes(): Promise<void> {
  await collectibles.createIndexes([
    { key: { game: 1, category: 1, cycle: 1 }, name: "game_category_cycle" },
    { key: { game: 1, slug: 1 }, unique: true, name: "game_slug_unique" },
    { key: { game: 1, status: 1 }, name: "game_status" },
  ]);
}
