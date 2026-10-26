/** Shop filtering: map search, IG-only toggle, and the all-shops menu list. */

export interface ShopProps {
  name: string;
  instagram: string | null;
  ig_followers: number | null;
  city?: string | null;
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
  const q = fold(query.trim());
  if (!q) return true;
  return fold(`${p.name} ${p.instagram ?? ""}`).includes(q);
}

/**
 * Filter a list of shop names by a free-text query (all-shops menu).
 * Accent- and case-insensitive, so "barilo" matches "Barilo Café".
 */
export function filterShopNames(names: string[], query: string): string[] {
  const q = fold((query ?? "").trim());
  if (!q) return names.slice();
  return names.filter((n) => fold(n).includes(q));
}
