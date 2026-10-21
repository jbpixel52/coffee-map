/** TikTok embed using TikTok's official embed.js SDK.
 *
 * This is TikTok's native embed method. The SDK handles iframe creation in a
 * way that bypasses X-Frame-Options restrictions. It supports embed types:
 * CREATOR, VIDEO, TAG, MUSIC, TRENDING, CURATED.
 *
 * For search pages we use the TAG embed type pointing to the equivalent
 * hashtag URL. The embed.js script automatically replaces blockquote elements
 * with iframes.
 */

/** Load TikTok's embed SDK script once. */
const EMBED_JS_URL = "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/falcon/embed";

let embedJsLoaded = false;

export function loadTikTokEmbedSdk(): Promise<void> {
  if (embedJsLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = EMBED_JS_URL;
    script.async = true;
    script.type = "text/javascript";
    script.onload = () => {
      embedJsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load TikTok embed SDK"));
    document.head.appendChild(script);
  });
}

/** Build a TikTok tag/hashtag URL from a shop name. */
export function tiktokTagUrl(shopName: string): string {
  const clean = shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.tiktok.com/tag/${clean}`;
}

/** Build a TikTok search URL (for fallback links). */
export function tiktokSearchUrl(shopName: string): string {
  const query = encodeURIComponent(shopName || "");
  return `https://www.tiktok.com/search?q=${query}`;
}

/** Render TikTok content into a container element using TikTok's SDK.
 * Uses embed.js which handles X-Frame-Options internally. */
export async function renderTikTokSearch(
  container: HTMLElement,
  shopName: string
): Promise<void> {
  await loadTikTokEmbedSdk();

  // Use tag URL for embed SDK support (search pages not supported by embed.js)
  const tagUrl = tiktokTagUrl(shopName);
  container.innerHTML = `
    <blockquote class="tiktok-embed" cite="${tagUrl}" data-video-id="" data-embed-type="tag">
      <section>
        <p>Cargando TikTok...</p>
        <a href="${tagUrl}" target="_blank" rel="noopener">Ver en TikTok</a>
      </section>
      <footer>
        <a href="${tagUrl}" target="_blank" rel="noopener" title="TikTok">TikTok</a>
      </footer>
    </blockquote>
  `;

  // TikTok SDK looks for elements with class "tiktok-embed"
  const embedBlock = container.querySelector(".tiktok-embed");
  if (embedBlock && (window as any).tt0s) {
    // The SDK's mounting logic - trigger rendering
    try {
      ;(window as any).tt0s(embedBlock);
    } catch (e) {
      // SDK may not be fully initialized yet; fall back to link
    }
  }
}
