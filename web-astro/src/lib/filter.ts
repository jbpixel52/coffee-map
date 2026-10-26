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
  const raw = fold(query.trim());
  if (!raw) return true;
  // An explicit @handle searches the handle only, so "@lumi" does not pull in
  // shops merely named "Lumi".
  if (raw.startsWith("@")) return fold(p.instagram ?? "").includes(raw.slice(1));
  return fold(`${p.name} ${p.instagram ?? ""}`).includes(raw);
}
