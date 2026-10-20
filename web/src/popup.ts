/** Click-preview popup for a café: name, Instagram embed, and outbound links. */

export interface ShopPreview {
  name: string;
  instagram?: string | null;
  ig_followers?: number | null;
  ig_latest_code?: string | null;
  ig_full_name?: string | null;
  lat?: number | null;
  lon?: number | null;
}

// Instagram shortcodes are [A-Za-z0-9_-]; anything else (quotes, slashes,
// angle brackets) is a URL-injection attempt and must be rejected.
const CODE_RE = /^[A-Za-z0-9_-]{5,24}$/;

export function escapeHtml(value: string): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Official Instagram post-embed URL for a shortcode; null when the code looks wrong. */
export function instagramEmbedUrl(code: string | null | undefined): string | null {
  if (!code || !CODE_RE.test(code)) return null;
  return `https://www.instagram.com/p/${code}/embed/`;
}

export function gmapsSearchUrl(name: string, lat?: number | null, lon?: number | null): string {
  const query = lat != null && lon != null ? `${name} ${lat},${lon}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function popupHtml(p: ShopPreview): string {
  const parts: string[] = [
    `<strong class="popup-name">${escapeHtml(p.name || "Café")}</strong>`,
  ];
  if (p.ig_full_name && p.ig_full_name !== p.name) {
    parts.push(`<span class="popup-fullname">${escapeHtml(p.ig_full_name)}</span>`);
  }
  const handle = (p.instagram || "").trim();
  if (handle) {
    const followers =
      typeof p.ig_followers === "number" && p.ig_followers > 0
        ? ` <span class="popup-followers">· ${p.ig_followers} seguidores</span>`
        : "";
    parts.push(`<span class="popup-handle">@${escapeHtml(handle)}${followers}</span>`);
    const embed = instagramEmbedUrl(p.ig_latest_code);
    if (embed) {
      parts.push(
        `<iframe class="popup-embed" src="${embed}" loading="lazy" ` +
          `allowtransparency="true" allowfullscreen scrolling="no"></iframe>`,
      );
    }
    parts.push(
      `<a class="popup-link" href="https://www.instagram.com/${encodeURIComponent(handle)}/" ` +
        `target="_blank" rel="noopener">Ver perfil completo ↗</a>`,
    );
  } else {
    parts.push(`<span class="popup-no-ig">Sin Instagram conocido</span>`);
  }
  parts.push(
    `<a class="popup-link popup-gmaps" href="${gmapsSearchUrl(p.name, p.lat, p.lon)}" ` +
      `target="_blank" rel="noopener">Google Maps ↗</a>`,
  );
  return `<div class="popup">${parts.join("")}</div>`;
}
