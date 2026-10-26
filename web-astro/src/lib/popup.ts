/** Outbound links for a café: Instagram embed, Google Maps search, TikTok tag. */

// Instagram shortcodes are [A-Za-z0-9_-]; anything else (quotes, slashes,
// angle brackets) is a URL-injection attempt and must be rejected.
const CODE_RE = /^[A-Za-z0-9_-]{5,24}$/;

/** Official Instagram post-embed URL for a shortcode; null when the code looks wrong. */
export function instagramEmbedUrl(code: string | null | undefined): string | null {
  if (!code || !CODE_RE.test(code)) return null;
  return `https://www.instagram.com/p/${code}/embed/`;
}

/** Instagram profile URL for a handle. */
export function instagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

export function gmapsSearchUrl(name: string, lat?: number | null, lon?: number | null): string {
  const query = lat != null && lon != null ? `${name} ${lat},${lon}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * TikTok hashtag slug for a shop name: "Granate Café" → "granatecafe".
 * TikTok tags carry no spaces or punctuation, so strip accents and non-alnum.
 */
export function tiktokTagSlug(name: string): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** TikTok search URL for a shop, using the shop's hashtag as the search tag. */
export function tiktokSearchUrl(name: string): string {
  const slug = tiktokTagSlug(name);
  const q = slug ? `#${slug}` : (name ?? "").trim();
  return `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
}
