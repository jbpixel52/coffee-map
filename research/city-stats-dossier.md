# City stats dossier

Authoritative population, area and published shop counts for the eleven cities on the
map, with the definition behind each number. Facts file: `city-stats-facts.json`.

Generated 2026-10-26. population = persons; area_km2 = land area in square kilometres.

> shops_published figures come from directories with different category definitions and are NOT comparable to each other or to the project's own counts (shops_ours). See research/city-stats-dossier.md.

## What changed against the shipped config

The app currently carries a single 2020 figure per city. This table is what the
research found instead: US cities have newer annual estimates, and the Mexican
municipios have a *localidad* (city proper) that is the fairer comparison for a
US city boundary.

| City | Population (year) | City proper (*localidad*) | Area km² | Published shops | This map | Coverage |
|---|---|---|---|---|---|---|
| New York City | 8,584,629 (2025) | — | 778.2 | 4,001 | 2,670 | 67% |
| Los Angeles | 3,869,089 (2025) | — | 1,218.6 | 4,750 | 1,170 | 25% |
| Mexico City | 9,209,944 (2020) | 9,209,944 | 1,485.2 | 7,287 | 1,051 | 14% |
| San Francisco | 826,079 (2025) | — | 120.9 | 1,792 | 786 | 44% |
| Seattle | 784,777 (2025) | — | 217.6 | 804 | 773 | 96% |
| San Diego | 1,406,106 (2025) | — | 844.6 | 1,750 | 674 | 39% |
| Tijuana | 1,922,523 (2020) | 1,810,645 | 1,239.5 | 1,470 | 627 | 43% |
| Oakland | 440,838 (2025) | — | 144.9 | 164 | 385 | 235% |
| Austin | 1,002,632 (2025) | — | 845.3 | 998 | 317 | 32% |
| Guadalajara | 1,385,629 (2020) | 1,385,629 | 150.4 | 1,471 | 201 | 14% |
| Ensenada | 443,807 (2020) | 330,652 | 13,313.7 | 421 | 27 | 6% |

**Coverage** is this map's count as a share of the published count. It is not a quality
score: the published figures come from directories whose category is wider than
'coffee shop' (Tijuana's, for example, includes soda fountains and ice-cream parlours),
so a low share can mean a narrower definition on our side *or* a broader one on theirs.

## Per city

### Austin (US)

- **Population** 1,002,632 — City proper (Census place), Vintage 2025 estimate. 2020 census: 961,855.
- **Metro** 2,550,637 (2024) — Census CBSA 2024 estimate, Austin-Round Rock-San Marcos
- **Area** 845.3 km² — Land area, 2024 Census Gazetteer (326.39 sq mi)
- **Published shop count** 998 — Rentech Digital (Apr 1 2026); 496 (Servestack); 348 'independent' (joe.coffee)
- **This map** 317 shops · 0.38/km² · 31.6/100k residents · population density 1,186/km²

**Why it matters.** Config area 823.4 is stale; the 2024 Gazetteer gives 845.3 km2. Austin's 845 km2 boundary makes municipal density (0.38 cafes/km2) look rural while its core is dense - the clearest case for a fixed-radius metric.

### Ensenada (MX)

- **Population** 443,807 — Municipio de Ensenada after the 2020 San Quintin split, INEGI Censo 2020. City proper (localidad Ensenada): 330,652.
- **City proper** 330,652 — per-capita on that base: 8.2 cafés/100k (on the wider boundary: 6.1)
- **Area** 13,313.7 km² — Municipio excluding islands, 13,313.7 km2 (INEGI figure cited in COPLADEM, Plan Municipal de Desarrollo 2025-2027)
- **Published shop count** 421 — mexicocafes.com, https://mexicocafes.com/cafes/baja-california/ensenada.html (census-derived, 2026)
- **This map** 27 shops · 0.00/km² · 6.1/100k residents · population density 33/km²

**Why it matters.** Config area 14,899 km2 is stale: it predates the creation of San Quintin (2020) and San Felipe (2021) municipios. Correct current area is 13,313.7 km2. Even so, municipal density is meaningless here (27 cafes / 13,314 km2); the city itself has 330,652 people and the cafes sit almost entirely in the urban strip.

### Guadalajara (MX)

- **Population** 1,385,629 — Municipio de Guadalajara, INEGI Censo 2020 (fully urbanised; localidad = municipio)
- **City proper** 1,385,629 — per-capita on that base: 14.5 cafés/100k (on the wider boundary: 14.5)
- **Metro** 5,268,642 (2020) — INEGI Censo 2020, ZM Guadalajara (10 municipios)
- **Area** 150.4 km² — Municipio, 150.36 km2 (IIEG, Guadalajara diagnostico municipal, Nov 2025)
- **Published shop count** 1,471 — mexicocafes.com, https://mexicocafes.com/cafes/jalisco/guadalajara.html (census-derived, 2026)
- **This map** 201 shops · 1.34/km² · 14.5/100k residents · population density 9,215/km²

**Why it matters.** Config area 151.5 is close but should be 150.36. The published 1,471 vs our 201 (14%) is the biggest relative gap after CDMX: Guadalajara's cafe culture is heavily traditional (cafeterias, neverias), which our Google-Maps queries under-sample.

### Los Angeles (US)

- **Population** 3,869,089 — City proper (Census place), Vintage 2025 estimate. 2020 census: 3,898,747.
- **Metro** 12,927,614 (2024) — Census CBSA 2024 estimate, Los Angeles-Long Beach-Anaheim
- **Area** 1,218.6 km² — Land area, 2024 Census Gazetteer (470.52 sq mi)
- **Published shop count** 4,750 — Rentech Digital (Apr 1 2026). Other published counts for the same city: 1,890 (SavorCity), 1,733 (LocalStitch), 1,151 (Pulled, specialty-leaning)
- **This map** 1,170 shops · 0.96/km² · 30.2/100k residents · population density 3,175/km²

**Why it matters.** The widest spread of any city here: 1,151-4,750 for the same boundary, a 4x range driven purely by category definition. Our 1,170 is at the low end. Treat LA's per-capita figure as extraction-limited, not market-limited.

### Mexico City (MX)

- **Population** 9,209,944 — Entidad (all 16 alcaldias) = city proper, INEGI Censo 2020
- **City proper** 9,209,944 — per-capita on that base: 11.4 cafés/100k (on the wider boundary: 11.4)
- **Metro** 21,804,515 (2020) — INEGI Censo 2020, ZM Valle de Mexico (76 municipios)
- **Area** 1,485.2 km² — Entidad, 1,485.2 km2 (INEGI, Panorama sociodemografico CDMX, EIC 2025)
- **Published shop count** 7,287 — mexicocafes.com, https://www.mexicocafes.com/estados/ciudad-de-mexico.html (census-derived, 2026)
- **This map** 1,051 shops · 0.71/km² · 11.4/100k residents · population density 6,201/km²

**Why it matters.** Published 7,287 vs our 1,051 (14%) is the largest absolute gap and suggests our extraction covers only the specialty/brunch segment. Density of 6,201/km2 makes CDMX the densest city in the set by far, so per-km2 comparisons reward it despite weak extraction.

### New York City (US)

- **Population** 8,584,629 — City proper (5 boroughs), Vintage 2025 estimate. 2020 census: 8,804,190.
- **Metro** 19,940,274 (2024) — Census CBSA 2024 estimate, New York-Newark-Jersey City
- **Area** 778.2 km² — Land area, 2024 Census Gazetteer (300.46 sq mi); excludes 445.4 km2 water
- **Published shop count** 4,001 — Rentech Digital, May 5 2025, https://rentechdigital.com/smartscraper/business-report-details/united-states/new-york/list-of-coffee-shops-in-new-york-city
- **This map** 2,670 shops · 3.43/km² · 31.1/100k residents · population density 11,031/km²

**Why it matters.** Highest extraction ratio of the big cities (67%), consistent with the project's NYC-heavy query set. Population density 11,031/km2 is the highest in the set, so NYC wins per-km2 metrics and sits mid-table per-capita.

### Oakland (US)

- **Population** 440,838 — City proper (Census place), Vintage 2025 estimate. 2020 census: 440,646.
- **Metro** 4,648,486 (2024) — Census CBSA 2024 estimate, SF-Oakland-Fremont (Oakland has no separate MSA)
- **Area** 144.9 km² — Land area, 2024 Census Gazetteer (55.96 sq mi); excludes 57.2 km2 water
- **Published shop count** 164 — joe.coffee, 'independent coffee shops' only (2026); Crema tracks 135 independent shops
- **This map** 385 shops · 2.66/km² · 87.3/100k residents · population density 3,042/km²

**Why it matters.** The only city where our count exceeds the published figure (385 vs 164), because the only readily available Oakland count excludes chains. Not comparable to the other rows - do not rank Oakland's per-capita figure against cities with all-shop counts.

### San Diego (US)

- **Population** 1,406,106 — City proper (Census place), Vintage 2025 estimate for July 1, 2025. 2020 census: 1,386,932.
- **Metro** 3,298,799 (2024) — Census CBSA 2024 estimate, San Diego-Chula Vista-Carlsbad
- **Area** 844.6 km² — Land area, 2024 Census Gazetteer (326.09 sq mi); excludes 120.0 km2 water
- **Published shop count** 1,750 — Rentech Digital, https://rentechdigital.com/smartscraper/business-report-details/united-states/california/list-of-coffee-shops-in-san-diego (Apr 1 2026); joe.coffee lists 501 'independent' shops
- **This map** 674 shops · 0.80/km² · 47.9/100k residents · population density 1,665/km²

**Why it matters.** City boundary runs to 844.6 km2 of mostly low-density land, so municipal density undersells the walkable core. Clever (2024) ranks SD 3rd nationally at 20.8 coffee shops per 100k, but its implied absolute count only reconciles at metro scale.

### San Francisco (US)

- **Population** 826,079 — City-county (Census place), Vintage 2025 estimate. 2020 census: 873,965.
- **Metro** 4,648,486 (2024) — Census CBSA 2024 estimate, San Francisco-Oakland-Fremont
- **Area** 120.9 km² — Land area, 2024 Census Gazetteer (46.69 sq mi); excludes 479.7 km2 water
- **Published shop count** 1,792 — Rentech Digital (Apr 1 2026); 627 'independent' (joe.coffee); 528 in an older study quoted by Time Out (2024)
- **This map** 786 shops · 6.50/km² · 95.1/100k residents · population density 6,833/km²

**Why it matters.** Tiny, fully built-out boundary (120.9 km2) makes SF the fairest per-km2 comparison in the set. Population has fallen ~5% since 2020, which mechanically lifts any per-resident metric.

### Seattle (US)

- **Population** 784,777 — City proper (Census place), Vintage 2025 estimate. 2020 census: 737,015.
- **Metro** 4,145,494 (2024) — Census CBSA 2024 estimate, Seattle-Tacoma-Bellevue
- **Area** 217.6 km² — Land area, 2024 Census Gazetteer (84.00 sq mi); excludes 150.4 km2 water
- **Published shop count** 804 — Rentech Digital (Apr 1 2026); 476 'independent' (joe.coffee)
- **This map** 773 shops · 3.55/km² · 98.5/100k residents · population density 3,606/km²

**Why it matters.** Our 773 vs 804 published = 96%, by far the best coverage match, which makes Seattle's #1 per-capita rank the most trustworthy single figure on the tab. Also note the 2011 NPD figure of 1,640 shops was metro-wide and is still quoted in local press.

### Tijuana (MX)

- **Population** 1,922,523 — Municipio de Tijuana (INEGI Censo 2020). City proper = localidad Tijuana, 1,810,645 (same census).
- **City proper** 1,810,645 — per-capita on that base: 34.6 cafés/100k (on the wider boundary: 32.6)
- **Metro** 2,157,853 (2020) — INEGI Censo 2020, ZM Tijuana (3 municipios)
- **Area** 1,239.5 km² — Municipio boundary, 1,239.49 km2 (IMPLAN Tijuana citing Programa Estatal de Desarrollo Urbano BC 2009-2013)
- **Published shop count** 1,470 — mexicocafes.com, https://mexicocafes.com/cafes/baja-california/tijuana.html (2026 directory built from economic-census 'cafeterias'; broad category incl. soda fountains/ice-cream)
- **This map** 627 shops · 0.51/km² · 32.6/100k residents · population density 1,551/km²

**Why it matters.** Area in config (1,239.6) is right. Published 1,470 is ~2.3x our 627; the census category is broader than 'coffee shop'. Specialty scene is small but real (Ilustre, Infuso, BOGESCA, Magul). Cross-border foot traffic makes resident-based per-capita a weak proxy for demand.

## How to read this

- Per-capita is only as good as the boundary behind the population. A municipio is
  not a city proper, and comparing one to a US city boundary understates Mexican
  density. Where `localidad` exists, prefer it for per-capita figures and say which
  base is in use.
- Populations of different vintages should never share a single caption year. If these
  numbers are adopted, the UI caption has to become year-aware per city.
- Published counts are context, not a target. They are useful for one question only:
  'is our number in a plausible range?' — 25% coverage of a broad directory and 96% of
  a narrow one can describe equally complete censuses.

## Provenance

Compiled by a delegated research pass (2026-10-26) that was interrupted before it wrote
this narrative; the facts file was already complete. This document is rendered from it
verbatim, so every number here is the one that pass recorded, with its own source line.
