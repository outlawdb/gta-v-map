import "dotenv/config";
import express from "express";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectibles, ensureIndexes } from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", async (_req, res) => {
  const count = await collectibles.countDocuments({ game: "gta5" });
  res.json({ ok: true, game: "gta5", totalCollectibles: count });
});

app.get("/api/categories", async (_req, res) => {
  const categories = await collectibles.distinct("category", { game: "gta5", status: { $ne: "removed" } });
  categories.sort((a, b) => a.localeCompare(b));
  res.json({ categories });
});

const querySchema = z.object({
  category: z.string().trim().min(1).optional(),
  cycle: z.coerce.number().int().min(1).max(7).optional(),
  q: z.string().trim().min(1).optional(),
});

app.get("/api/collectibles", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query" });

  const { category, cycle, q } = parsed.data;

  const filter: Record<string, unknown> = {
    game: "gta5",
    status: { $ne: "removed" },
  };

  if (category) filter.category = category;
  if (cycle) filter.cycle = cycle;
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const rows = await collectibles
    .find(filter, {
      projection: {
        _id: 0,
        game: 1,
        slug: 1,
        name: 1,
        category: 1,
        cycle: 1,
        payout: 1,
        coords: 1,
        status: 1,
        updatedAt: 1,
      },
    })
    .sort({ category: 1, name: 1 })
    .toArray();

  res.json({ total: rows.length, items: rows });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

await ensureIndexes();

app.listen(port, () => {
  console.log(`GTAV Collectors Map running on http://localhost:${port}`);
});
