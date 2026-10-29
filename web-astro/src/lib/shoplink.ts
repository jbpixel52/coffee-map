/**
 * Deep links to a single café: `?shop=matcha-cafe-maiko` opens that card and flies to it.
 *
 * The slug is derived from the name alone — names are not unique (a chain has many
 * branches), so a deep link resolves to the first match, which is the right behaviour for
 * sharing "this café" when the sharer did not pin coordinates.
 */
export function shopSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents so "Café" and "Cafe" slug alike
    .toLowerCase()
    .replace(/['’]/g, "") // "Yosi's" -> "yosis", not "yosi-s"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
