export type CollectibleStatus = "available" | "removed" | "limited";

export type Collectible = {
  game: "gta5";
  slug: string;
  name: string;
  category: string;
  setLabel?: string;
  cycle: number;
  payout: number;
  order?: number;
  notes?: string;
  video?: {
    yt_id: string;
    yt_user?: string;
    start?: string;
    end?: string;
  };
  status: CollectibleStatus;
  coords: { x: number; y: number };
  source: {
    kind: "official" | "community" | "measured";
    ref: string;
  };
  updatedAt: Date;
};
