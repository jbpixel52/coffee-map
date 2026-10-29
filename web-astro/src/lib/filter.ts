/** Shop filtering: map search, IG-only toggle, and the all-shops menu list. */

/**
 * Every property a feature carries in `public/data/shops.geojson`. The key set is pinned
 * to `schema/shop-properties.json` by a test on both sides (here and in
 * tests/test_export.py), so a rename in export.py fails a build instead of shipping a
 * card full of blanks.
 */
export interface ShopProps {
  /** always emitted by export.py */
  name: string;
  instagram: string | null;
  ig_followers: number | null;
  /** the rest are optional because panels build partial objects from list rows; the key
   *  set is still pinned to schema/shop-properties.json by the contract test */
  id?: number;
  ig_full_name?: string | null;
  ig_latest_code?: string | null;
  ig_last_post_at?: string | null;
  website?: string | null;
  address?: string | null;
  /** which sources contributed: "osm", "gmaps", or both */
  sources?: string[];
  city?: string | null;
  city_slug?: string | null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Public fold helper: accent/case-insensitive name matching. */
export const foldName = fold;

export function shopMatches(
  p: ShopProps,
  query: string,
  onlyInstagram: boolean,
  city: string | null = null,
): boolean {
  if (city && p.city !== city) return false;
  if (onlyInstagram && !p.instagram) return false;
  const raw = fold(query.trim());
  if (!raw) return true;
  // An explicit @handle searches the handle only, so "@lumi" does not pull in
  // shops merely named "Lumi".
  if (raw.startsWith("@")) return fold(p.instagram ?? "").includes(raw.slice(1));
  return fold(`${p.name} ${p.instagram ?? ""}`).includes(raw);
}
