/** Right sidebar: TikTok search for the selected café. */

/** TikTok search URL for a shop name. */
export function tiktokSearchUrl(name: string): string {
  const q = (name ?? "").trim();
  return `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
}

/** Sidebar heading for a shop: "TikTok: <name>". */
export function sidebarTitle(name: string): string {
  return `TikTok: ${(name ?? "").trim() || "Café"}`;
}

/**
 * Filter a list of shop names by a free-text query.
 * Accent- and case-insensitive, so "barilo" matches "Barilo Café".
 */
export function filterShopNames(
  names: string[],
  query: string,
): string[] {
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const q = fold((query ?? "").trim());
  if (!q) return names.slice();
  return names.filter((n) => fold(n).includes(q));
}
