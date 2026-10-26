# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, all served by the same screen (confirmed):

1. **Tijuanenses already in the city** — the primary scene. Standing on a corner or at a desk, deciding *where to go for coffee right now*: near me, is it open, does it look like a place I'd sit in.
2. **Visitors from San Diego and elsewhere** — planning a day; they need neighbourhood shape, not 608 undifferentiated dots: where the scene is, what's worth the trip.
3. **Café-culture watchers** — reading the scene itself: which zones are dense, which shops carry social weight (Instagram followers, latest post).

## Product Purpose

An exhaustive, sourced map of every café in Tijuana — 608 shops today — built from OpenStreetMap, Google Maps and Instagram scrapes, so that anyone can find a real café nearby and see its social footprint. Success is a person choosing a café and leaving for it, or sharing the view with someone else.

## Positioning

**Census completeness plus social enrichment.** OSM supplies the backbone, Google Maps fills the shops OSM misses, Instagram adds a handle, follower count and latest post per shop — joined by a deliberately conservative name matcher (a wrong link is worse than a missing one). Nothing else mapping Tijuana cafés carries all three, and every number is auditable: the pipeline is archive-first, so any export can be replayed from captured bytes.

## Operating Context

- Static Astro site on GitHub Pages, served from `/coffee-map/`, copy in Spanish (es-MX).
- Data is refreshed by local scrape runs and committed as `web-astro/public/data/shops.geojson` + `meta.json`; the site itself does no live querying.
- Used in a hand, outdoors, on a corner, frequently on poor mobile signal — a PWA with a service worker.
- Map rendering: MapLibre GL over OpenFreeMap vector tiles, restyled as a printed plan (no sprite, no textures).

## Capabilities and Constraints

Must keep working (confirmed by the owner):

- Search by shop name; "con Instagram" filter; live count of shown shops.
- Follower-weighted heatmap with per-zone clustering.
- Shop detail card: Instagram post embed (official iframe, latest post), Google Maps link, TikTok hashtag search by shop name.
- Dark mode (follows the OS, with a manual override), PWA install banner, shareable `?ll=&z=` view link, Escape closes panels.
- Attribution: OpenStreetMap (ODbL), Google Maps, Instagram — must remain visible.

Hard constraints:

- No API keys, no paid tile service, no external basemap vendor (the owner vetoed Stadia/Stamen; the basemap is self-styled and self-hosted).
- The public export carries no ratings or review text (Google terms); Instagram is logged-out public profile data only.
- 608 shops, 120 with Instagram. Shop names are real and unedited (Spanish, accents, mixed case).
- 13 unnamed places exist in the pipeline but are excluded from the export.

## Brand Commitments

- **Voice: Spanish (es-MX), plain and local.** No marketing tone, no English chrome.
- **The map is the product.** Interface chrome is a guest on it.
- **Hand-made, printed character** — the map reads as a printed plan, not a generic basemap.
- **Palette: Pantone's NYFW Spring/Summer 2027 report** (owner's instruction, 2026-10-26). The
  seasonless shades are the ground and ink; the seasonal colours do data work. Interface chrome
  stays neutral — the owner asked for a quieter screen than the enamel-yellow version.

## Evidence on Hand

- `web-astro/public/data/shops.geojson` — 608 features: `name`, `instagram`, `ig_followers`, `ig_full_name`, `ig_latest_code`, `ig_last_post_at`, `website`, `sources[]`.
- `web-astro/public/data/meta.json` — city, generated_at, shop_count, with_instagram.
- Real Spanish shop names, real coordinates, real follower counts. No testimonials, no ratings, no opening hours, no prices — **do not invent any of these**.
- Absent and must not be fabricated: reviews, ratings, "abierto ahora", photos of the shops, price level.

## Product Principles

1. **The map is the argument.** Chrome that does not help you choose a café does not ship.
2. **Density needs shape.** 608 dots are data, not a decision; the surface must turn a census into a choice.
3. **Provenance, quiet but visible.** Sources sit in the surface, never as a paragraph of legalese over the map.
4. **Local truth over tourist gloss.** Real names, real numbers, no invented ratings or hours.
5. **Works in a hand on a bad signal** — the mobile case is the design case.

## Accessibility & Inclusion

Keyboard: Escape closes panels, visible focus rings, controls name their action. `prefers-reduced-motion` honoured for every transition. Body text and secondary text at 4.5:1 minimum against whatever ground it sits on. Spanish only for now (city config makes other cities possible later).
