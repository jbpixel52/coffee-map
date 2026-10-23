# Enhancements — backlog

Written after the Astro + prettymaps pass (2026-10-23). Ordered by payoff per
hour; the first block is already shipped, the rest is proposed.

## Shipped in this pass

- **prettymaps as a map layer** — `hero.png` georeferenced by `hero.json`,
  draped as a raster over the watercolor style, alpha ramp so its square edges
  fade into the paper instead of reading as a pasted card; 🖼️ toggle in the
  topbar; dimmed in dark mode; hidden above zoom 15 where vectors stay crisp.
- **Translucent heat** — `heatmap-opacity` 0.4 → 0.28, intensity 0.7 → 0.55,
  zone circles 0.85 → 0.55, so the map stays readable under the heat.
- **TikTok hashtag search** — `tiktokSearchUrl()` now searches
  `#<shop-slug>` (`Granate Café` → `#granatecafe`). No TikTok iframe/sidebar
  (X-Frame-Options makes it impossible).
- **Profile discovery** — new offline `coffeemap ig-discover` mines archived
  profile HTML for suggested handles and queues them as IG candidates; wired
  into `scripts/refresh.sh` before `ig-recon`.
- **Shareable view** — `?ll=&z=` stay in the URL as the map moves.
- **Keyboard + a11y** — Escape closes card/menu/popup, count is
  `aria-live="polite"`, art toggle is `aria-pressed`.
- **Reduced motion** — `prefers-reduced-motion` skips the fly-to animation.
- **UI fixes found while verifying** — the all-cafés menu and the PWA banner
  were rendered by Tamagui with inline `position/display` that overrode their
  CSS, leaving the menu clipped on screen at load and the banner over the
  topbar; both now use plain wrappers so `global.css` wins.
- **Cleanup** — retired Vite `web/` deleted (27 files), `.gitignore` pruned,
  README updated for the new layer, command, and licence credit.

## Next (small)

1. **Zone posters in the card** — `prettymaps_art.py` can render `zone-N.png` /
   `card.png` (not committed yet: generate them, then show the poster for the
   clicked zone in the detail card — great for sharing a shop).
2. **Palette lock-step** — sample the poster's dominant colours and assert the
   watercolor palette stays within a small ΔE so the raster → vector handoff at
   zoom 15 is invisible.
3. **Marker clustering** — at city zoom the Centro dots merge into a smudge;
   `cluster: true` on the shops source with a count bubble, expanding on click.
4. **Data-freshness badge** — `meta.json` has `generated_at`; warn in the
   footer when it is older than 14 days.
5. **Sitemap + per-shop URLs** — `?shop=<slug>` deep links and a generated
   `/cafe/<slug>` page per shop for search engines and sharing.
6. **Offline data** — cache `shops.geojson` in the service worker with
   stale-while-revalidate so the PWA works on a bad connection.

## Next (structural)

7. **Pipeline observability** — `fetches` table already records every archive
   write; add `coffeemap status --json` and a tiny HTML run report so a refresh
   can be audited without reading logs.
8. **Classifier triage queue** — the 1.5B gate marks most bare handles
   `not_cafe`; add a `--review` file of borderline handles with the evidence,
   so a human can settle them in one pass instead of per-row SQL.
9. **Typed export contract** — share one schema between `export.py` and
   `lib/details.ts` (JSON Schema → generated TS types) so a renamed property
   fails at build time, not as a blank card.
10. **Tile budget** — the bundle is one ~1.3 MB chunk (MapLibre + Tamagui);
    lazy-load the detail card and split vendors once the app grows past this.
