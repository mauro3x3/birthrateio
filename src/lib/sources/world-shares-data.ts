import pack from "@/lib/data/world-shares.json";

export type WorldSharesPack = typeof pack;
export type WorldShareCountry = (typeof pack.countries)[number];

export const WORLD_SHARES = pack;

export function getWorldShares() {
  return WORLD_SHARES;
}
