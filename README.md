# Coffee Map

A web map of **every coffee shop in Tijuana** — 273 shops and counting — built
from three scraped sources with an archive-first pipeline. Live at
**https://jbpixel52.github.io/coffee-map/**.

| Layer | Source | What it contributes |
|---|---|---|
| Backbone | OpenStreetMap (Overpass, ODbL) | the full café census — node/way coordinates, names, tags |
| Enrichment | Google Maps search (logged-out scrape) | shops OSM misses, with coordinates + place ids |
| Social | Instagram profiles (logged-out recon) | handle + follower count per shop (13 profiles today) |

Map UI: MapLibre GL over **OpenFreeMap** vector tiles (OSM data), re-styled
with a **custom watercolor theme** — warm paper with fiber + grain, saturated
turquoise water with pooling blooms, apple-green and peach washes, blurred
edges, multi-color pigment drift (`web/src/watercolor.ts`, sprite in
`web/public/styles/`). On top of the style, a **painted-at-rest pass**:
an SVG turbulence displacement + soft blur over the canvas (disengaged while
panning/zooming so motion stays smooth) and a screen-space paper overlay with
`mix-blend-mode: multiply`, so the vector geometry stops reading as
machine-straight. Both degrade gracefully to a clean map if unsupported.
The visual reference is Stamen Watercolor, but no Stadia/Stamen service is
used. Spanish (es-MX) strings, marker popups with a Google Maps search link.
Data is refreshed by local scrape runs; GitHub Actions only builds and deploys
the committed data.

## Quickstart

```bash
uv sync                                # Python 3.12 toolchain
uv run coffeemap osm-fetch             # Overpass -> data/archive/ (bytes on disk first)
uv run coffeemap osm-parse             # parse archive -> data/coffeemap.db
uv run coffeemap gmaps-fetch --max-scrolls 6   # 3 Google Maps queries, gentle pacing
uv run coffeemap gmaps-parse
uv run coffeemap ig-recon --limit 60   # logged-out IG profile recon (handles from OSM)
uv run coffeemap merge                 # canonical shops (100 m + name≥0.80 dedupe)
uv run coffeemap export                # web/public/data/{shops.geojson,meta.json}
uv run coffeemap status                # row counts per table
```

Or the whole chain: `scripts/refresh.sh`.

Web app:

```bash
cd web && npm ci && npm test && npm run build
npx vite preview --port 5199 --strictPort       # http://localhost:5199/coffee-map/
uv run python web/tests/smoke.py http://localhost:5199/coffee-map/   # headless smoke
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
  `web/public/data/` — the shipped data. Don't un-anchor it.
- **`ensure_browsers_path()` before `import patchright`** — patchright caches
  `PLAYWRIGHT_BROWSERS_PATH` at import time; the agent runtime's inherited
  value points at browsers this driver never installed.

## Changing the city

Everything city-shaped lives in `config/city.toml` (name, country, locale,
timezone, centre/zoom, Overpass bbox, Google Maps queries). San Diego is one
config + one refresh away. The UI strings are Spanish for now.

## Data sources & licences

- OpenStreetMap © OpenStreetMap contributors, **ODbL** — attribution is
  displayed in the map footer and must stay.
- Google Maps — names/coordinates from public search pages; the public export
  carries no ratings or review text.
- Instagram — public profile fields (handle, follower count) only.
- Map tiles — **OpenFreeMap** vector tiles from OpenStreetMap data (free,
  keyless, no attribution requirement beyond OSM's). The watercolor look is
  our own MapLibre style (`web/src/watercolor.ts`): palette + a self-hosted
  sprite with paper/mottle/wash/drift/bloom tiles and a `paper.png` overlay
  (`web/public/styles/`, regenerate with
  `uv run --with pillow python scripts/make_sprite.py`). No external tile
  service, no API keys; footer keeps the OSM (ODbL) credit.

## Repo layout

```
config/city.toml            the city (only file to edit for a new one)
src/coffeemap/              pipeline: sources/{osm,gmaps,ig}.py, store, merge, export, cli
scripts/                    refresh.sh, fixture captures, IG discovery probe
tests/                      pytest suite (fixtures = real captured bytes)
web/                        Vite + MapLibre app; web/public/data holds the export
data/                       local only (gitignored): SQLite db + gzip archive
.github/workflows/deploy.yml  build web/ -> GitHub Pages on push to main
```

Full build plan: `.hermes/plans/2026-10-19_212930-coffee-map.md`.
