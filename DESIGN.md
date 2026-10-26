# Design system — Cafés de Tijuana

<!-- impeccable:design-schema 1 -->

A quiet product shell over a printed city plan. The shell borrows shadcn/ui's
anatomy — hairline borders, one primary, 8–12px radii, soft single-offset
shadows, neutral surfaces — and the colour comes from **Pantone's NYFW
Spring/Summer 2027 palette**: the five seasonless shades carry the ground and
the ink, the ten seasonal colours do data work.

## Palette (Pantone TCX)

Hex values: W3Schools' 2027 list, codes matched to Pantone's report.

| Pantone | TCX | Hex | Job |
|---|---|---|---|
| Antique White | 11-0105 | `#eee5d3` | app ground, plan paper |
| Dolphin | 16-2901 | `#9a9699` | borders (mixed), recessive marks |
| Blue Indigo | 19-3928 | `#49516d` | ink, primary, road hairlines |
| Tarragon | 15-0326 | `#a4ae77` | parks, landcover |
| Waterfall | 15-5516 | `#3ab0a2` | accent, water, has-Instagram dots, focus ring |
| Anise Flower | 12-0717 | `#f4e3b5` | heat floor |
| Arrowwood | 16-0954 | `#bc8d1f` | heat mid |
| Langoustino | 16-1440 | `#ca6c56` | heat mid-high, zone bloom |
| Chili Pepper | 19-1557 | `#9b1b30` | heat peak, warning, "sin Instagram" |
| Lavender Oil | 15-3615 | `#c3a6cd` | night heat, secondary |
| Rosy Future | 15-1910 | `#f37e9b` | night warning |
| Princess Blue | 19-4150 | `#00539c` | reserved (no role yet) |
| Dragon Fire | 16-1460 | `#fd652d` | reserved (no role yet) |
| Daiquiri Green | 12-0435 | `#c9d77e` | reserved (no role yet) |
| Hibiscus | 18-1762 | `#de3848` | reserved (no role yet) |

Tokens (`global.css`), all derived from those:

| Token | Day | Night |
|---|---|---|
| `--background` | `#eee5d3` | `#191c27` |
| `--surface` | `#f7f3eb` | `#202432` |
| `--surface-2` | `#efe9dd` | `#262a38` |
| `--border` / `--border-input` | `#cbc4bb` / `#c0b8ae` | `#333849` / `#3d4356` |
| `--fg` | `#49516d` (6.26:1 on ground) | `#f2eada` (13.6:1) |
| `--fg-muted` | `#606479` (4.67:1) | `#d3ccc0` (10.7:1) |
| `--primary` / `--primary-fg` | `#49516d` / `#f7f3eb` | `#eee5d3` / `#191c27` |
| `--accent` / `--ring` | `#3ab0a2` | `#3ab0a2` |
| `--warn` | `#9b1b30` | `#f37e9b` |

Rules the palette has to respect:

- **Chrome is neutral; colour is data.** Waterfall marks what we can show you
  (Instagram), Tarragon is land, Waterfall tints water, the warm four are heat.
  Nothing decorative gets a seasonal colour.
- **Waterfall never carries white text** (2.1:1). It is a fill, a ring, water and
  a dot — the dot's Blue Indigo stroke is what makes it visible (6.26:1).
- Night keeps the same data hues; only surfaces invert.

## Type

One family: **Hanken Grotesk** (variable, self-hosted, `src/assets/fonts/`).
Map labels use the tiles' own Noto Sans glyphs.

Scale: 11.5 / 12.5 / 13.5 / 15 / 20 / 26 px. Weights 400 (body), 500 (rows,
buttons), 600 (titles, numerals). Nothing above 600 — the previous world's 900s
were the loudest thing on the screen.

## Shape, depth, motion

- Radii: 6 (badges/credit) / 8 (buttons, inputs, rows) / 12 (cards, tag, sheet).
- Shadows: `--shadow-sm` for the header and cards, `--shadow` for floating
  surfaces (tag, PWA toast). Single offset, soft blur — no coloured halos, no
  offset blocks.
- Motion: 150ms ease on hover/focus; the mobile rail slides 280ms on
  `cubic-bezier(0.16,1,0.3,1)`. `prefers-reduced-motion` collapses all of it.

## Components (shadcn anatomy, hand-written CSS)

| Element | Anatomy |
|---|---|
| Header (`.band-top`) | `--surface`, 1px bottom border, `--shadow-sm`; 36px squircle pictogram in `--primary`; wordmark 15/600 + 11.5 muted; search input 36px, 1px `--border-input`, radius 8, ring on focus; pills 32px radius 999; count 22/600 tabular + muted caption |
| Rail (`.rail`) | ground `--background`, 1px left border; head 13/600 + muted count + ghost icon buttons; rows 8px padding, radius 8, hover `--surface-2`; selected row = `--primary` at 10% with primary text (no coloured border) |
| Ficha (`.slip`) | card: `--surface`, 1px border, radius 12, `--shadow-sm`, 16px padding; title 20/600; handle in `--accent-fg`; figures separated by hairlines; embed radius 8 with a 1px border; primary + outline buttons, 36px, `gap: 8px` |
| Map tag (`.tag`) | popover: surface, 1px border, radius 8, `--shadow`, 8px rotated tail; MapLibre owns the transform (`anchor: bottom`, `offset: [0,-10]`) — CSS must not translate it again |
| PWA toast (`.pwa`) | card + `--shadow`, bottom centre, primary + outline buttons |
| Attribution (`.credit-strip`) | 11.5px muted on translucent surface, 1px border, radius 6 |

Icons are drawn SVG (`Icons.tsx`), 1.9 stroke, one 24×24 box. No emoji.

## Map style

`lib/plan.ts`: MapLibre style over OpenFreeMap planet tiles, no sprite, no
textures, roads as single hairline strokes with no casings, no POI / road-name /
house-number layers, monumental letterspaced place names. `PLAN` (day) and
`PLAN_NIGHT` must stay **disjoint** and every colour in the style must appear in
`PLAN_NIGHT` — both asserted in `plan.test.ts`.

Hard-won constraints:

- **One zoom `interpolate` per expression.** A `case` holding two makes MapLibre
  drop the layer *silently* (fires `error`, never throws).
- **A layer id must differ from its source id** (`shops-dots` reads `shops`).
- **`["get","dim"]` is not a boolean** — use `["==", ["get","dim"], true]`.
- Remap is case-insensitive; palette hexes are lowercase so both directions agree.
- `window.__mapErrors` collects map errors; `tests/smoke.py` fails on them.

## Retired and not to be reintroduced

Watercolour basemap, paper/mottle sprite, canvas displacement filter, prettymaps
raster poster, Tamagui chrome, emoji icon buttons, the MapLibre popup — and the
enamel-yellow sign world that replaced them (owner: too aggressive).
