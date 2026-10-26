# Design system — Cafés de Tijuana

<!-- impeccable:design-schema 1 -->

Two materials, and nothing else: **the printed plan** (paper, ink hairlines,
monumental place letters) and **the enamel sign** (saturated yellow, black type,
white pictogram on a black square). The world is an airport sign system hung
over a city sheet. If an element belongs to neither material, it does not ship.

## Colour

Roles, not shades. Every colour in `web-astro/src/lib/plan.ts` has exactly one
counterpart in `PLAN_NIGHT`, and the two sets are disjoint by test.

| Token | Day | Night | Job |
|---|---|---|---|
| `--paper` / `PLAN.paper` | `#eeede7` | `#100e0a` | the sheet's ground, panels' base |
| `--paper-deep` | `#e4e2d8` | `#191510` | building fill on the plan |
| `--ink` / `PLAN.ink` | `#12100c` | `#f4ecd8` | roads, boundaries, all body type |
| `--ink-soft` | `#3a382f` | `#d8cfb6` | secondary type, attribution |
| `--ink-faint` | `#6b685c` | `#a89e86` | captions, labels inside panels |
| `--sign` | `#f2c230` | `#f2c230` | the sign: bands, rail, tag, dots-with-Instagram, heat midpoint |
| `--sign-deep` | `#dcac14` | `#e0ad18` | pressed/inset state on the sign |
| `--vermilion` | `#c2402a` | `#e2603f` | one state only: the Instagram handle, errors |
| `PLAN.water` | `#b8cdd6` | `#16232b` | water |
| `PLAN.park` | `#c6cfc0` | `#1d2418` | parks, landcover |

Type on the sign is always `#12100c`, in both themes: the enamel does not change
colour at night, the sheet does.

**Why these.** A sign system's whole value is that the sign is the same object in
daylight and at night; that is why `--sign` never inverts while everything else
does. Yellow carries the two zones a visitor *acts* in (top band, rail); the map
stays paper so the dots read.

## Type

One family for the interface, one for the plan.

| Voice | Face | Use |
|---|---|---|
| Interface | **Hanken Grotesk** (variable, self-hosted from `src/assets/fonts/`) | every control, label, name, number |
| Plan lettering | Noto Sans / Noto Sans Bold served by OpenFreeMap glyphs | map labels only — the tiles' own font stack |

Scale (fixed steps, no in-between sizes): 11 / 12.5 / 15 / 19 / 27 / 38 px.
Weights: 400 (body), 600 (secondary), 700 (names, labels), 900 (numerals, headings).

Discipline borrowed from signage:

- Labels are `text-transform: uppercase` with `letter-spacing: 0.1–0.22em` at 9–11px.
- Counts are set `font-weight: 900` + `font-variant-numeric: tabular-nums`, 30px in the band.
- Place names on the plan are upcased and tracked (`place-neighbourhood`, size 13→30 px
  across z9→z15) — the lettering *is* the wayfinding, not a caption.
- No italics anywhere. No display face as a costume: the hero is a number.

## Layout

- The map is `position: fixed; inset: 0`. Chrome floats over it; nothing insets the map.
- Top band: 64px (56px on mobile), full width minus the rail.
- Rail: 340px, right, from under the band to the foot. Ranking by followers; becomes the
  ficha on selection. Below 900px it is a 68vh bottom sheet, closed until asked.
- Selected shop: a `maplibregl.Marker` tag — 2px ink border, 3px hard offset shadow,
  pointer line down to the dot; `transform: translate(-50%, calc(-100% - 12px))`.
- Attribution: a strip bottom-left, 9.5px, never a paragraph over the map.
- Spacing rhythm: 6 / 8 / 10 / 12 / 14 / 18 px inside panels; 22–28 px at region edges.

## Components

| Component | Notes |
|---|---|
| `SignBand` | pictogram square (36px drawn cup) · wordmark + tracked subtitle · search field (white, 2px ink) · chips · night toggle · count block |
| `RankRail` | hairline rows (1px ink @15%), name 700 / handle 11px / followers 900 tabular; hover fills 8% ink |
| `Ficha` | a *paper slip* on the yellow board: 2px ink border, no radius, kicker + 38px name + handle in vermilion + figures row + IG embed + action buttons |
| `PwaBanner` | ink bar with sign-coloured type, not a card |
| `Icons` | drawn SVG only, 1.9 stroke, one 24×24 box. No emoji, ever |

Corners are square except the tag/`.field` (0 radius everywhere — a sign has cut
edges, not rounded ones).

## States

- **Filtered out = dimmed, not hidden.** Non-matching shops stay on the plan as 1.6px
  ink ghosts at 0.3 opacity (`shops-dots-dim`); the count and the rail follow. The
  census never loses its shape.
- **Selected** = tag on the map + ficha in the rail + `aria-pressed` on nothing else.
- **Empty result** = one sentence in the rail naming the query and the fix.
- **Loading** = full-sheet `loading` overlay with a 3px sweeping rule.
- **Error** = same overlay, vermilion heading, "Revisa tu conexión y recarga."
- **Focus** = 2px ink outline, 2px offset, in both themes.

## Motion

One authored moment: the mobile rail slides on `cubic-bezier(0.16, 1, 0.3, 1)` over
280ms. `flyTo` is 800ms, or 0 under `prefers-reduced-motion`, which also collapses
every transition and animation to 0.001ms. No entrance animations, no hover bounces,
no parallax: a sign does not animate.

## Map style

`lib/plan.ts` is a full MapLibre style over OpenFreeMap planet tiles: no sprite, no
textures, roads as single hairlines (no casings), no POI, road-name or house-number
layers, and 11 layers' worth of palette that `PLAN_NIGHT` must cover (asserted).

Hard-won constraints:

- **One zoom `interpolate` per expression.** A `case` holding two of them makes
  MapLibre drop the whole layer *silently* (it fires `error`, never throws). Hence two
  circle layers with filters instead of one with a `case`.
- **A layer id must not equal its source id.** Layer `shops-dots` reads source `shops`.
- **`["get","dim"]` is not a boolean**; `["==", ["get","dim"], true]` is.
- `window.__mapErrors` collects every map error so `tests/smoke.py` can fail on them.

## What was retired and must not come back

The watercolour basemap, the paper/mottle sprite, the SVG displacement filter over the
canvas, the prettymaps raster poster, the Tamagui chrome, emoji icon buttons, and the
Lagrange popup. Owner's decision: one clean map, no raster poster.
