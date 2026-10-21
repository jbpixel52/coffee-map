/** TikTok embed using official oEmbed API — renders inside the app without iframes. */

import { escapeHtml } from "./popup";

export interface TikTokEmbedResult {
  html: string;
  embedType: "profile" | "hashtag";
  title: string;
  authorName: string | null;
}

/** Generate a safe TikTok hashtag slug from a shop name. */
export function tiktokTagSlug(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fetch TikTok oEmbed for a given TikTok URL.
 * Returns the embed HTML (blockquote + embed.js script) or null on failure. */
export async function fetchTikTokOEmbed(tiktokUrl: string): Promise<TikTokEmbedResult | null> {
  const apiUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;
  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const embedType = data.embed_type === "profile" ? "profile" : "hashtag";
    return {
      html: data.html ?? "",
      embedType,
      title: data.title ?? "",
      authorName: data.author_name ?? null,
    };
  } catch {
    return null;
  }
}

/** Try profile oEmbed first (using IG handle as TikTok handle guess),
 * then fall back to hashtag oEmbed. Returns the best available embed HTML. */
export async function getTikTokEmbedHtml(name: string, igHandle?: string | null): Promise<string> {
  // 1) Try profile embed using IG handle as TikTok handle guess
  if (igHandle && igHandle.trim()) {
    const profileUrl = `https://www.tiktok.com/@${igHandle.trim()}`;
    const profileResult = await fetchTikTokOEmbed(profileUrl);
    if (profileResult?.html) return profileResult.html;
  }

  // 2) Fall back to hashtag embed
  const tag = tiktokTagSlug(name);
  if (!tag) return "";
  const tagUrl = `https://www.tiktok.com/tag/${tag}`;
  const tagResult = await fetchTikTokOEmbed(tagUrl);
  if (tagResult?.html) return tagResult.html;

  // 3) No embed available — return fallback card
  return tiktokFallbackHtml(name);
}

/** Fallback card when no TikTok embed is available. */
export function tiktokFallbackHtml(name: string): string {
  const tag = tiktokTagSlug(name);
  const searchUrl = tag
    ? `https://www.tiktok.com/search?q=${encodeURIComponent(tag)}`
    : "https://www.tiktok.com/";
  return `
    <div class="tiktok-fallback">
      <p>No hay embed de TikTok disponible para <strong>${escapeHtml(name)}</strong></p>
      <a href="${searchUrl}" target="_blank" rel="noopener" class="tiktok-fallback-link">
        Buscar en TikTok ↗
      </a>
    </div>
  `;
}

/** Ensure TikTok's embed.js is loaded once. */
let embedJsLoaded = false;
export function ensureTikTokEmbedJs(): void {
  if (embedJsLoaded) return;
  if (document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
    embedJsLoaded = true;
    return;
  }
  const script = document.createElement("script");
  script.src = "https://www.tiktok.com/embed.js";
  script.async = true;
  document.head.appendChild(script);
  embedJsLoaded = true;
}