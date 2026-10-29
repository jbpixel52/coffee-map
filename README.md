# Coffee Map

A web map of **9,393 coffee shops across 11 cities** — built from three
scraped sources with an archive-first pipeline. Live at
**https://jbpixel52.github.io/coffee-map/**.

Cities: Austin (317), Ensenada (32), Guadalajara (213), Los Angeles (1,224), Mexico City (1,097), New York City (2,955), Oakland (385), San Diego (838), San Francisco (849), Seattle (814), Tijuana (669).

917 shops carry an Instagram handle, and about two thirds have a street address
(OSM `addr:*`, plus the Google Maps card text for Tijuana and San Diego).

The **Stats** tab compares cities on density per sq mi, cafés per 100k residents,
cafés per ZIP code, Instagram reach (share and combined followers), the mean walk
to the next café (a sampled mean, labelled as such so nobody reads it as
the typical walk), the most repeated name, and how many shops have an address. Areas
and populations are city-proper (US) or municipio (MX) 2020 census figures, kept in
`config/city*.toml` next to each city, so densities compare only loosely across the
border — the panel says so. Every figure is ranked against the other cities.

Matcha-first places count as cafés: the Overpass query takes every `amenity=cafe` plus
matcha-branded tea shops and `cuisine=matcha` places, because they serve coffee too.
Plain `shop=tea` (boba, tea houses) stays out — that is a different census.

Above the rows sits the city's own card (sketch 10 of twelve): the shop count as a hero
number, a stamp carrying that city's share of the whole map, and three facts that
actually exist for it — density, Instagram share, busiest ZIP, falling back to walk
distance or address coverage when a city has no handles yet. A postcard that prints a
0% share for a city whose discovery never ran would be lying.

A city's scrape can reach across a border (Tijuana's Maps queries return Chula Vista
cafés). `merge_cities.py` drops a city's claim on a shop another city already owns at
the same coordinates, keeping the claim whose postcode belongs to that city.

| Layer | Source | What it contributes |
|---|---|---|
| Backbone | OpenStreetMap (Overpass, ODbL) | the full café census — node/way coordinates, names, tags |
| Enrichment | Google Maps search (logged-out scrape) | shops OSM misses, with coordinates + place ids |
| Social | Instagram profiles (logged-out recon) | handle + follower count per shop (712 profiles fetched) |

Map UI: MapLibre GL over **OpenFreeMap** vector tiles with a style of our own
(`web-astro/src/lib/plan.ts`) that draws the city as a **printed plan** — Antique
White paper, Blue Indigo hairline roads with no casings, flat parks and water, and
place names set monumentally. No top bar: the map is full bleed, with a
**transparent title bar** (the city name, gooey-morphed) and **expandable tabs**
(icons at rest, the open tab shows its label) floating over it. The tabs open
panels — a **shops list** as a stacked list with a drawn avatar per café and an
Instagram badge, and **settings** (night mode, heatmap). Picking a café lifts its
row and opens its *ficha* as a card (Instagram embed, followers, Google Maps,
TikTok) plus a tag on the map itself. Filtering **dims** the census instead of
hiding it. Colour is **Pantone's NYFW Spring/Summer 2027 report** — seasonless shades as
ground and ink, **Chili Pepper** as the single accent (tabs, primary buttons,
selected row, dots), seasonal hues on avatars, heat running Anise Flower →
Arrowwood → Langoustino → Chili Pepper. Night inverts sheet and
shell. Spanish (es-MX) strings, PWA-installable, `prefers-reduced-motion` honoured.
Tokens and rules: `DESIGN.md`.

Shareable state lives in the URL: `?ll=&z=` pins the view, and `?shop=<slug>` opens that
café's card and flies to it (`lib/shoplink.ts`; a chain has branches, so a slug resolves to
the first match). Selecting a shop writes the slug, closing the card removes it.

Offline: the service worker (`public/sw.js`) serves the census stale-while-revalidate and
static assets cache-first, so after one visit the list, filters and cards work with no
network — the basemap does not, since tiles are remote and deliberately not cached. The
credit strip dates the data and turns to the warning colour once it is more than 14 days
old (`lib/freshness.ts`).
Data is refreshed by local scrape runs; GitHub Actions only builds and deploys
the committed data.

## Cities

One city per pipeline run; `config/city.toml` is Tijuana, `config/city.san-diego.toml`
is San Diego. Point the whole chain at the second city with env vars and stitch the
exports together:

```bash
export COFFEEMAP_CITY=config/city.san-diego.toml COFFEEMAP_DB=data/coffeemap-sd.db \
       COFFEEMAP_ARCHIVE=data/archive-sd
uv run coffeemap osm-fetch && uv run coffeemap osm-parse
uv run coffeemap gmaps-fetch --max-scrolls 3 && uv run coffeemap gmaps-parse
uv run coffeemap merge
COFFEEMAP_OUT=data/export/sd uv run coffeemap export   # Tijuana: COFFEEMAP_OUT=data/export/tj
uv run python scripts/merge_cities.py                  # -> web-astro/public/data/{shops.geojson,meta.json}
```

Every feature carries `city` + `city_slug`, and the map filters on them (Todas /
Tijuana / San Diego). San Diego is OSM + Google Maps only so far: the café-or-not
gate and Instagram recon need the local model host, which was unreachable during
this run.

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

## Cities

Everything city-shaped lives in a TOML file: name, country, locale, timezone,
centre/zoom, Overpass bbox, Google Maps queries, web search queries.
`config/city.toml` is Tijuana; `config/city.san-diego.toml` is San Diego. The
pipeline is one city per run, selected by environment variables, so a second
city needs no code path:

```bash
COFFEEMAP_CITY=config/city.san-diego.toml \
COFFEEMAP_DB=data/coffeemap-sd.db \
COFFEEMAP_ARCHIVE=data/archive-sd \
uv run coffeemap osm-fetch      # …osm-parse, gmaps-fetch, gmaps-parse, merge

COFFEEMAP_CITY=config/city.toml  uv run coffeemap merge  # per city
COFFEEMAP_OUT=data/export/tj COFFEEMAP_CITY=config/city.toml uv run coffeemap export
COFFEEMAP_OUT=data/export/sd COFFEEMAP_CITY=config/city.san-diego.toml \
  COFFEEMAP_DB=data/coffeemap-sd.db uv run coffeemap export
uv run python scripts/merge_cities.py   # data/export/* -> web-astro/public/data
```

`scripts/merge_cities.py` tags every feature with its `city` and writes the one
`shops.geojson` the map ships; the UI's city filter reads `meta.json.cities`.
The UI strings are Spanish for now.

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
  keyless, no attribution requirement beyond OSM's). The plan style is our own
  MapLibre style (`web-astro/src/lib/plan.ts`): palette, layer set and the night
  remap; no external tile service, no API keys, no sprite assets. The footer
  keeps the OSM (ODbL) credit.
- prettymaps art — retired from the shipped UI by the owner's decision (one clean
  map, no raster poster). `scripts/prettymaps_art.py` stays in the repo as a
  standalone tool; nothing in `web-astro/` consumes it.
- Type — Hanken Grotesk (SIL Open Font License), self-hosted from
  `web-astro/src/assets/fonts/`. Map labels use the glyphs OpenFreeMap serves.
- Colour — Pantone Fashion Color Trend Report for NYFW Spring/Summer 2027
  (seasonless shades + top-10 accents); hex values from W3Schools' 2027 list,
  codes matched to Pantone's report.

## Repo layout

```
config/city.toml            the city (only file to edit for a new one)
src/coffeemap/              pipeline: sources/{osm,gmaps,ig,web}.py, classify, store, merge, export, cli
scripts/                    refresh.sh, fixture captures, IG discovery probe, prettymaps_art.py
tests/                      pytest suite (fixtures = real captured bytes)
web-astro/                  Astro + React + MapLibre app; public/data holds the export
data/                       local only (gitignored): SQLite db + gzip archive
.github/workflows/deploy.yml  build web-astro/ -> GitHub Pages on push to main
```

Full build plan: `.hermes/plans/2026-10-19_212930-coffee-map.md`.
