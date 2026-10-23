# Coffee Map

A web map of **every coffee shop in Tijuana** — 608 shops and counting — built
from three scraped sources with an archive-first pipeline. Live at
**https://jbpixel52.github.io/coffee-map/**.

| Layer | Source | What it contributes |
|---|---|---|
| Backbone | OpenStreetMap (Overpass, ODbL) | the full café census — node/way coordinates, names, tags |
| Enrichment | Google Maps search (logged-out scrape) | shops OSM misses, with coordinates + place ids |
| Social | Instagram profiles (logged-out recon) | handle + follower count per shop (119 profiles fetched) |

Map UI: MapLibre GL over **OpenFreeMap** vector tiles (OSM data), re-styled
with a **custom watercolor theme** — warm paper with fiber + grain, saturated
turquoise water with pooling blooms, apple-green and peach washes, blurred
edges, multi-color pigment drift (`web-astro/src/lib/watercolor.ts`, sprite in
`web-astro/public/styles/`). On top of the style, a **painted-at-rest pass**:
an SVG turbulence displacement + soft blur over the canvas (disengaged while
panning/zooming so motion stays smooth) and a screen-space paper overlay with
`mix-blend-mode: multiply`, so the vector geometry stops reading as
machine-straight. Both degrade gracefully to a clean map if unsupported.
Over Zona Centro the map drapes a **prettymaps** poster
(`scripts/prettymaps_art.py` → `web-astro/public/art/hero.png` +
`hero.json`): the static OSM artwork is georeferenced as a MapLibre raster
layer, fully opaque at city zoom, fading out by zoom 15 where the vector
watercolor takes over; the 🖼️ topbar button toggles it. The visual reference
is Stamen Watercolor, but no Stadia/Stamen service is used. Spanish (es-MX)
strings, marker popups with an inline Instagram post embed (official iframe,
latest post), a Google Maps search link, and a **TikTok hashtag search** built
from the shop name (`tiktokSearchUrl` → `tiktok.com/search?q=%23<slug>`).
Data is refreshed by local scrape runs; GitHub Actions only builds and deploys
the committed data.

## Quickstart

```bash
uv sync                                # Python 3.12 toolchain
uv run coffeemap osm-fetch             # Overpass -> data/archive/ (bytes on disk first)
uv run coffeemap osm-parse             # parse archive -> data/coffeemap.db
uv run coffeemap gmaps-fetch --max-scrolls 8   # 20 zone/term Google Maps queries, gentle pacing
uv run coffeemap gmaps-parse
uv run coffeemap web-search --limit 12 # local search service (fastCRW) SERPs -> archive
uv run coffeemap web-scrape --per-query 5      # directory/blog listicles -> archive
uv run coffeemap web-candidates        # extract café candidates (gmaps links, lists, IG handles)
uv run coffeemap classify-validate     # sanity battery on the local model
uv run coffeemap classify-candidates --kinds place,name   # Kev tier: café-or-not for candidates (place,name)
uv run coffeemap classify-places       # same gate for scraped gmaps/web places
uv run coffeemap candidates-apply      # promote café verdicts to places (dedupe 120 m + name)
uv run coffeemap ig-discover           # offline: mine archived IG pages for suggested handles
uv run coffeemap ig-recon --limit 60   # logged-out IG profile recon (places + candidates)
uv run coffeemap ig-enrich             # offline: full_name + latest post code from archive
uv run coffeemap classify-candidates --kinds ig
uv run coffeemap ig-attach             # link IG profiles to places (name/handle match)
uv run coffeemap merge                 # canonical shops (100 m + name≥0.80 dedupe)
uv run coffeemap export                # web-astro/public/data/{shops.geojson,meta.json}
uv run coffeemap status                # row counts per table
```

Or the whole chain: `scripts/refresh.sh`.

Web app (Astro + React + Tamagui + MapLibre):

```bash
cd web-astro && npm ci && npm test && npm run build
npx astro preview --port 4321                    # http://localhost:4321/coffee-map/
uv run python web-astro/tests/smoke.py http://localhost:4321/coffee-map/   # headless smoke
```

## Rules of the pipeline

- **Archive-first:** every fetch writes gzipped raw bytes to
  `data/archive/<date>/` *before* any parser runs. Parsers can be fixed and
  replayed offline (`gmaps-parse`, `osm-parse`) without re-scraping.
- **Logged-out only.** No sessions, ever: Google Maps search pages and public
  Instagram profile pages render enough for v1. Instagram hashtag/location
  discovery is a documented **no-go** while logged out
  (`docs/ig-discovery-spike.md`).
- **Ignore lists are anchored:** `data/` (not `/data/`) would swallow
  `web-astro/public/data/` — the shipped data. Don't un-anchor it.
- **`ensure_browsers_path()` before `import patchright`** — patchright caches
  `PLAYWRIGHT_BROWSERS_PATH` at import time; the agent runtime's inherited
  value points at browsers this driver never installed.
- **The classifier is local ("Kev" tier).** `classify_*` commands call the
  machine's local LLM stack (LiteLLM `local-small`, an OVMS-served Qwen2.5),
  never a hosted API — zero paid tokens. `classify-validate` runs a labeled
  battery first; a wrong answering layer (e.g. a decision shim with broken
  prompts) should be caught there, not mid-pipeline.

## Changing the city

Everything city-shaped lives in `config/city.toml` (name, country, locale,
timezone, centre/zoom, Overpass bbox, Google Maps queries, web search queries).
San Diego is one config + one refresh away. The UI strings are Spanish for now.

## Data sources & licences

- OpenStreetMap © OpenStreetMap contributors, **ODbL** — attribution is
  displayed in the map footer and must stay.
- Google Maps — names/coordinates from public search pages; the public export
  carries no ratings or review text. Directory pages that embed Google Maps
  links (`/maps/place/.../data=…`) contribute place ids + coordinates too.
- Web search — SERPs from the local `fastCRW` service; only used to find names
  and Instagram handles of cafés (no article text is shipped).
- Instagram — public profile fields (handle, follower count, full name) and
  the latest post's shortcode, embedded on the map via Instagram's official
  post-embed iframe. Nothing is mirrored: the click-preview loads directly
  from instagram.com. Handles for **other** accounts co-mentioned on those
  archived pages are mined offline (`ig-discover`) and only ever become
  candidates; they reach a shop after recon + classification, like any other
  handle.
- Map tiles — **OpenFreeMap** vector tiles from OpenStreetMap data (free,
  keyless, no attribution requirement beyond OSM's). The watercolor look is
  our own MapLibre style (`web-astro/src/lib/watercolor.ts`): palette + a self-hosted
  sprite with paper/mottle/wash/drift/bloom tiles and a `paper.png` overlay
  (`web-astro/public/styles/`, regenerate with
  `uv run --with pillow python scripts/make_sprite.py`). No external tile
  service, no API keys; footer keeps the OSM (ODbL) credit.
- prettymaps art — `prettymaps` (AGPL-3.0) draws the Zona Centro poster from
  OpenStreetMap data (`uv run python scripts/prettymaps_art.py`); every figure
  keeps prettymaps' own OSM + prettymaps credit line. The PNG is georeferenced
  by the `hero.json` written next to it.

## Repo layout

```
config/city.toml            the city (only file to edit for a new one)
src/coffeemap/              pipeline: sources/{osm,gmaps,ig,web}.py, classify, store, merge, export, cli
scripts/                    refresh.sh, fixture captures, IG discovery probe, prettymaps_art.py
tests/                      pytest suite (fixtures = real captured bytes)
web-astro/                  Astro + React + Tamagui + MapLibre app; public/data holds the export
data/                       local only (gitignored): SQLite db + gzip archive
.github/workflows/deploy.yml  build web-astro/ -> GitHub Pages on push to main
```

Full build plan: `.hermes/plans/2026-10-19_212930-coffee-map.md`.
