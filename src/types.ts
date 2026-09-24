export type CollectibleStatus = "available" | "removed" | "limited";

export type Collectible = {
  game: "gta5";
  slug: string;
  name: string;
  category: string;
  cycle: number;
  payout: number;
  status: CollectibleStatus;
  coords: { x: number; y: number };
  source: {
    kind: "official" | "community" | "measured";
    ref: string;
  };
  updatedAt: Date;
};
