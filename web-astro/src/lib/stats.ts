/**
 * Per-city stats for the stats tab: densities, ZIP spread, social reach, and a
 * few stats nobody asked for that turn out to be the interesting ones.
 *
 * Pure — features + meta in, plain numbers out — so it can be tested without a
 * map and memoised in one place.
 */
import type { Feature, Point } from "geojson";
import type { ShopProps } from "./filter";
import { foldName } from "./filter";

export interface CityMeta {
  name: string;
  shop_count: number;
  with_instagram: number;
  /** city proper (US) or municipio (MX), 2020 census — units differ by country */
  population?: number;
  area_sq_km?: number;
}

export interface CityStats {
  name: string;
  shops: number;
  /** share of every café on the map, 0-100 */
  sharePct: number;
  /** null when the city has no area on record */
  perSqMi: number | null;
  per100k: number | null;
  zipCount: number;
  shopsPerZip: number | null;
  topZip: { zip: string; count: number } | null;
  igShops: number;
  igPct: number;
  followers: number;
  medianFollowers: number;
  topShop: { name: string; followers: number } | null;
  /** mean distance to the nearest other café, metres (sampled on big cities) */
  nearestM: number | null;
  brand: { name: string; count: number; pct: number } | null;
  addressPct: number;
}

const SQ_KM_PER_SQ_MI = 2.589988110336;
/** Above this many shops the nearest-neighbour mean samples sources, not targets. */
const NEAREST_SAMPLE = 600;
/** First words that carry no brand: they are the category, not the name. */
const BRAND_STOP = new Set([
  "cafe", "cafes", "coffee", "cafeteria", "cafeterias", "the", "el", "la", "los", "las",
  "de", "del", "un", "una", "y", "and", "shop", "co", "mx", "maison", "casa",
]);

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/** Mexican CP and US ZIP are both five digits, so one pattern covers both. */
export function zipOf(address: string | null | undefined): string | null {
  const m = /\b(\d{5})\b/.exec(address ?? "");
  return m ? m[1] : null;
}

function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dp = ((bLat - aLat) * Math.PI) / 180;
  const dl = ((bLon - aLon) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Mean distance from a café to its nearest neighbour. A dense grid of 2,670
 * cafés is 7M pair tests, so large cities sample every k-th source against the
 * full set: the mean moves by a metre or two, which is fine for a headline.
 */
export function meanNearestM(points: Array<[number, number]>): number | null {
  if (points.length < 2) return null;
  const stride = Math.max(1, Math.ceil(points.length / NEAREST_SAMPLE));
  let total = 0;
  let counted = 0;
  for (let i = 0; i < points.length; i += stride) {
    const [lat, lon] = points[i];
    let best = Infinity;
    for (let j = 0; j < points.length; j += 1) {
      if (j === i) continue;
      const [lat2, lon2] = points[j];
      const d = haversineM(lat, lon, lat2, lon2);
      if (d < best) best = d;
    }
    if (Number.isFinite(best)) {
      total += best;
      counted += 1;
    }
  }
  return counted ? total / counted : null;
}

/** The most repeated brand prefix, with its share of the city. */
export function topBrand(
  names: string[],
  shops: number,
): { name: string; count: number; pct: number } | null {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of names) {
    const folded = foldName(raw ?? "").trim();
    const token = folded.split(/\s+/)[0] ?? "";
    if (token.length < 3 || BRAND_STOP.has(token)) continue;
    const seen = counts.get(token);
    if (seen) seen.count += 1;
    else counts.set(token, { label: (raw ?? "").trim().split(/\s+/)[0], count: 1 });
  }
  let best: { name: string; count: number; pct: number } | null = null;
  for (const [, { label, count }] of counts) {
    // a "brand" has to be worth mentioning: at least 3 shops and 1% of the city
    if (count < 3 || count / Math.max(1, shops) < 0.01) continue;
    if (!best || count > best.count) {
      best = { name: label, count, pct: Math.round((count / Math.max(1, shops)) * 1000) / 10 };
    }
  }
  return best;
}

export function cityStats(
  features: readonly Feature<Point>[],
  cities: readonly CityMeta[],
): CityStats[] {
  const all = features.length || 1;
  return cities.map((meta) => {
    const mine = features.filter((f) => (f.properties as Partial<ShopProps> | null)?.city === meta.name);
    const props = mine.map((f) => f.properties as Record<string, unknown>);
    const shops = mine.length;
    const igShops = props.filter((p) => Boolean(p.instagram)).length;
    const followers = props
      .map((p) => (typeof p.ig_followers === "number" ? (p.ig_followers as number) : 0))
      .filter((n) => n > 0);
    const top = mine.reduce<{ name: string; followers: number } | null>((best, f) => {
      const p = f.properties as Record<string, unknown>;
      const n = typeof p.ig_followers === "number" ? (p.ig_followers as number) : 0;
      if (n <= 0) return best;
      const name = String(p.name ?? "");
      return !best || n > best.followers ? { name, followers: n } : best;
    }, null);

    const zips = new Map<string, number>();
    let withAddress = 0;
    for (const p of props) {
      const address = typeof p.address === "string" ? p.address : "";
      if (address) withAddress += 1;
      const zip = zipOf(address);
      if (zip) zips.set(zip, (zips.get(zip) ?? 0) + 1);
    }
    const topZip = [...zips.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const areaSqMi = meta.area_sq_km ? meta.area_sq_km / SQ_KM_PER_SQ_MI : 0;

    return {
      name: meta.name,
      shops,
      sharePct: Math.round((shops / all) * 1000) / 10,
      perSqMi: areaSqMi > 0 ? Math.round((shops / areaSqMi) * 100) / 100 : null,
      per100k:
        meta.population && meta.population > 0
          ? Math.round((shops / (meta.population / 100_000)) * 10) / 10
          : null,
      zipCount: zips.size,
      shopsPerZip: zips.size ? Math.round((shops / zips.size) * 10) / 10 : null,
      topZip: topZip ? { zip: topZip[0], count: topZip[1] } : null,
      igShops,
      igPct: shops ? Math.round((igShops / shops) * 1000) / 10 : 0,
      // no follower capture yet (only TJ and SD ran ig-recon): 0 means "unknown",
      // so keep it distinct from a real zero in the UI and in the rankings
      followers: followers.reduce((a, b) => a + b, 0),
      medianFollowers: median(followers),
      topShop: top,
      nearestM: meanNearestM(
        mine.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]),
      ),
      brand: topBrand(props.map((p) => String(p.name ?? "")), shops),
      addressPct: shops ? Math.round((withAddress / shops) * 1000) / 10 : 0,
    };
  });
}

/** 1 → "1st", 2 → "2nd", 11 → "11th"; the stats tab only needs en. */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** City names ranked best-first for one metric (higher is better unless `lower`). */
export function rankBy(
  stats: readonly CityStats[],
  pick: (s: CityStats) => number | null,
  lower = false,
): string[] {
  return [...stats]
    .filter((s) => pick(s) !== null)
    .sort((a, b) => {
      const av = pick(a) as number;
      const bv = pick(b) as number;
      return lower ? av - bv : bv - av;
    })
    .map((s) => s.name);
}
