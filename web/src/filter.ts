export interface ShopProps {
  name: string;
  instagram: string | null;
  ig_followers: number | null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function shopMatches(p: ShopProps, query: string, onlyInstagram: boolean): boolean {
  if (onlyInstagram && !p.instagram) return false;
  const q = fold(query.trim());
  if (!q) return true;
  return fold(`${p.name} ${p.instagram ?? ""}`).includes(q);
}
