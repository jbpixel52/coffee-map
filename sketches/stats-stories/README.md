# 12 ways to tell the coffee-map stats

Concept sketches, not product code. Every page is one self-contained file at **1200×760**,
built from the project's own `:root` token block (copied verbatim from
`web-astro/src/styles/global.css`) and the **real census snapshot** in `_data.json`
(8,681 shops, 11 cities, computed from `web-astro/public/data/shops.geojson`).

Open `index.html` for the gallery, or any `NN-*/index.html` on its own.

## Head to head

| # | Sketch | Mechanic | Question it answers | Data | Verdict |
|---|---|---|---|---|---|
| 01 | Café capital scoreboard | Sortable table, inline bars, medal | "How do the cities rank?" | ready | **Ship it.** Boring and correct; every other idea needs it as a fallback. |
| 02 | Density ribbon | One dot per density unit + walk distance | "How dense does each city *feel*?" | ready | **Ship it.** One glance, no legend needed. Fix the scale caption. |
| 03 | ZIP atlas | Card per city, heat = cafés per ZIP | "Which postal code is the café capital?" | ready | Good as an entry point; the honest version is a real ZIP choropleth on the map. |
| 04 | Walk to the next café | Ranked walk bars | "How far to my next espresso?" | ready | **Ship it.** The most quotable stat on the map. Keep the sampling footnote. |
| 05 | Insight cards | Auto-written one-claim cards | "What's the story here?" | ready | Best for social sharing; needs a threshold rule per card or it turns into horoscope copy. |
| 06 | Density vs social | Scatter, bubble = shop count | "Who is dense *and* online?" | ready | The one chart that says something the table can't (Tijuana is an outlier). 11 dots is the ceiling. |
| 07 | City fingerprint | Radar of 5 normalised stats, 2 cities | "What *is* this city's shape?" | ready | Lovely, arguable, and easy to over-read. Never call the area a score. |
| 08 | Who owns the block | Most repeated name + share | "How chain-heavy is each city?" | partial | Needs a real brand key; prefix matching over-counts. Idea is strong, method isn't. |
| 09 | Stats that drive the map | Metric picker + city chips brush the map | "Show me, don't table me" | ready | The most product-shaped of the twelve; needs a prototype, not a mock. |
| 10 | Postcards | One hero number per card | "Send me this city" | ready | Delightful, and the only one that works as a share image. Pairs with 01, never alone. |
| 11 | Same city, different rank | Slope of rank by shops → rank by density | "Who moves when the metric changes?" | ready | Sharp insight (NY falls, SF climbs). Cap it to the movers or it's spaghetti. |
| 12 | Coffee wire | Ambient insight ticker in the map corner | "Tell me something while I browse" | ready | Zero-click storytelling; must be dismissible and never cover the map. |

Data legend: **ready** = computed from the census as it stands. **partial** = the sketch
runs on real numbers but the method behind that number needs work first.

## If only three shipped

1. **02 Density ribbon** — it makes the map's core claim ("a café every 116 m") visible
   without reading a number.
2. **04 Walk to the next café** — the most human of the metrics, and it reframes the census
   as a walking experience.
3. **06 Density vs social** — the only view where two disjoint stats become one argument.

Then 01 as the always-available table, and 10 as the share card.

## Regenerate

```bash
cd sketches/stats-stories
python3 _gen.py          # writes NN-*/index.html + index.html gallery
```

`_data.json` is the snapshot the mocks read; `_tokens.css` is the verbatim token block.
Nothing here touches product code — the live app is unchanged.

## Known gaps in the mocks

- 08 brand share uses first-word matching, so "Starbucks" is right but "Peet's" vs "Peets"
  and any two-word brand are not yet handled.
- 03 is a card grid, not a geographic choropleth: real ZIP polygons would need a boundary
  source the pipeline does not have yet.
- 11 has 11 labels per side; at more cities it needs to show only the biggest movers.
