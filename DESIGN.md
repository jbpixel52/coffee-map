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

## Shell

No top bar. The map is full bleed and three transparent layers float over it:

**Title bar** (`.titlebar`, no background) — the city name in **GooeyText**: two
stacked spans, one rAF loop, the outgoing layer blurring out (5px) while the
incoming one blurs in, so the pair reads as one fluid shape. It cycles
`<city>` → `Cafés de <city>`, 0.7s morph / 4.2s hold; the incoming text is
Waterfall, the resting one Blue Indigo. Reduced motion swaps without blur.

> The 21st.dev build thresholds alpha with an SVG filter. That needs an opaque
> ground: on a transparent one the threshold crushes anti-aliased alpha and the
> text disappears. Blur does the same job and survives both grounds.

**Expandable tabs** (`.tabs`, top right) — icons at rest, the open tab grows to
show its label (max-width transition) and turns Waterfall; a click outside the
tabs and panels collapses it, a click inside a panel does not. Two tabs: `Cafés`
(with the live count) and `Ajustes`. Keyboard: arrows move between tabs.

**Panels** (`.panel`) — a card docked under the tabs, right side, 388px, radius
16, `--shadow`: header (title + count + ghost close), tools row, scrolling body.

| Element | Anatomy |
|---|---|
| Shops panel | tools = search field (36px, ring on focus) + `Con Instagram` chip; body = stacked list |
| Stacked list (`.stack-row`) | 38px squircle avatar, name 13.5/500, handle 11.5 muted, followers 12.5/600 in Arrowwood, chevron; hover `--surface-2`; selected lifts with `--shadow-sm` + 1px Waterfall inset, no coloured border |
| Avatars | drawn, not fetched: the pipeline never archives profile pictures, and an Instagram CDN URL expires. Deterministic Pantone accent per handle (Waterfall, Princess Blue, Tarragon, Lavender Oil, Arrowwood, Rosy Future, Chili Pepper, Daiquiri Green), each with a text colour ≥4.5:1; a small Waterfall Instagram badge marks shops that have a handle |
| Settings panel | switch rows: Moon icon in Lavender Oil (night), the **🔥 emoji** with an emoji font stack (heat). Switches are 42×24 tracks with an 18px knob |
| Ficha (`.ficha-card`) | card on the left, 360px: title 20/600, handle in Waterfall, hairline-separated figures, IG embed radius 8, Waterfall primary button + outline buttons |
| Map tag (`.tag`) | popover: surface, 1px border, radius 8, `--shadow`, rotated tail; MapLibre owns the transform (`anchor: bottom`, `offset: [0,-10]`) |
| PWA toast | card + `--shadow`, bottom centre |
| Attribution | 11.5px muted strip, bottom left |

Icons are drawn SVG (`Icons.tsx`), 1.9 stroke, one 24×24 box. The single
exception is the fire in settings, which the owner asked to be the coloured emoji.

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
