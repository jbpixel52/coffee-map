# Café stories — 11 cities

Working dossier for the Stats tab: one section per city with a scene summary, sourced
shop-level stories, one chart hook we can actually compute, and an explicit list of what
could not be verified.

Written 26 Oct 2026. Every factual claim below carries a link. Shop counts, ZIP counts,
Instagram shares and distances come from `web-astro/public/data/shops.geojson` +
`meta.json` in this repo (computed for this dossier, method at the end); anything from
outside the repo is linked.

## The map in numbers (for chart scaffolding)

| City | Shops | Shops/km² | Busiest ZIP (count) | Instagram share | Median gap to next café* |
|---|---|---|---|---|---|
| New York City | 2,670 | 3.43 | 10003 (73) | 5.7% | 76 m |
| Los Angeles | 1,170 | 0.96 | 90012 (36) | 9.7% | 146 m |
| Mexico City | 1,051 | 0.71 | 06600 (34) | 1.7% | 120 m |
| San Francisco | 786 | 6.47 | 94122 (50) | 6.2% | 71 m |
| Seattle | 773 | 3.56 | 98122 (61) | 7.5% | 82 m |
| San Diego | 674 | 0.80 | 92101 (43) | 6.1% | 104 m |
| Tijuana | 627 | 0.51 | 22010 (6) | 18.7% | 100 m |
| Oakland | 385 | 2.66 | 94704 (27)† | 9.4% | 98 m |
| Austin | 317 | 0.38 | 78701 (27) | 8.2% | 243 m |
| Guadalajara | 201 | 1.33 | 44160 (7) | 4.0% | 187 m |
| Ensenada | 27 | 0.002 | 22800 (3) | 0% | 147 m |

\* Straight-line median distance to the nearest other café in the same city, not a walking
route. † 94704 is Berkeley, not Oakland — see the Oakland caveat.

**Instagram share is not a behaviour chart yet.** Share counts shops with a *known handle*,
so it measures discovery depth per city, not the scene: Tijuana's 18.7% (117 of 627) follows
completed discovery passes, while Mexico City's 1.7% (18 of 1,051) reflects one that never
ran. Follower coverage is now much more even — a recon loop logged 700 public profiles
across every city on 26–27 Oct (561 shops with a follower count) — but the denominator is
still inequality of discovery, so compare absolute audience, not share.

---

## Austin — 317 shops, 0.38/km²

**Scene.** Austin's coffee identity is built on roasting and on the food trailer. Cuvée
started roasting in 1998 and is one of the state's oldest specialty roasters; a decade
later the food trailer and the patio-with-food-trucks model (Radio's yard, Paperboy's
move from trailer to restaurant) became a recognised Austin café form. The cafés that
survived are as much bars and music venues as coffee shops, and the ones that closed in
2025 did so quickly — Cenote shut in
the spring and reopened four months later on a different street. Chain coverage is heavy:
65 of the 317 mapped cafés are named exactly "Starbucks".

**Stories.**
- **Cuvée Coffee (1998)** — founded in 1998, when Mike McKim began building a direct-trade
  network; it is one of Texas' oldest specialty roasters, and it now sells the nitro cold
  brew it claims to have poured first (on tap, at Austin's Slow Food Quiz Bowl, 14 Aug 2012) and
  whose canned "Black & Blue" won BevNET's Best of 2015 packaging award.
  [cuveecoffee.com](https://cuveecoffee.com/pages/about-us) ·
  [The Way to Coffee](https://www.thewaytocoffee.com/roasters/cuvee-coffee/) ·
  [Eater, 2 Sep 2015](https://www.eater.com/drinks/2015/9/2/9244337/what-is-nitro-coffee) ·
  [BevNET, Jan 2016](https://www.bevnet.com/news/2016/cuvee-coffee-wins-best-packaging-innovation-at-bevnets-best-of-2015/)
- **Houndstooth Coffee (2010)** — Sean Henry opened the first shop on North Lamar in
  2010; his brother Paul came to work as a barista, and the pair later took the format to
  Dallas. It is the bar-first, no-laptop end of Austin café culture.
  [CultureMap](https://austin.culturemap.com/news/restaurants-bars/atx-food-drink-houndstooth-coffee-austin-dallas) ·
  [Sprudge](https://sprudge.com/the-henry-brothers-continue-to-expand-houndstooth-coffee-in-austin-130890.html)
- **Paperboy (trailer → restaurant, July 2020)** — one of the city's best-known breakfast
  trailers moved into a brick-and-mortar on East 11th in July 2020, the clearest local
  example of the trailer-to-café pipeline.
  [Austin American-Statesman, 8 Jul 2020](https://www.statesman.com/story/entertainment/dining/restaurant-reviews/2020/07/08/one-of-austinrsquos-best-food-trailers-paperboy-opens-restaurant-thursday/113759694/)
- **Radio Coffee & Beer (2014)** — musician Jack Wilson came back from Seattle's specialty
  scene and opened a café in a renovated 1940s house on Menchaca Road with his father
  Greg: house-roasted coffee, local beer, food trucks and live music. Radio/East followed
  in 2023.
  [radiocoffeeandbeer.com/story](https://radiocoffeeandbeer.com/story)
- **Cenote (closed spring 2025, reopened 3 Sep 2025)** — a long-running East Side café
  that briefly closed and came back on East 7th, a rare 2025 reopening in a year of
  closures.
  [CultureMap, 3 Sep 2025](https://austin.culturemap.com/news/restaurants-bars/cenote-reopening-east-7th/)

**Chart hook.** "Starbucks is one in five Austin cafés": 65 of 317 entries carry exactly
that name — plot chain share per city and Austin sits beside LA (19.8%) at the top, while
the city's third-wave story lives in the remaining 80%.

**Not verified.** Cuvée's "first nitro on tap" claim is the founder's own, repeated by
Eater and flagged `citation needed` on
[Wikipedia](https://en.wikipedia.org/wiki/Cold_brew_coffee) — treat it as a claim, not a
record. The 2012 date comes only from that disputed line.

---

## Ensenada — 27 shops, 0.002/km²

**Scene.** The thinnest data on the map is also the youngest scene: 27 cafés, 13 with a
street address, none with an Instagram handle. What exists is a small cluster of
specialty bars and roasters in the Zona Centro. The wine-country crossover — the Valle de
Guadalupe sits in the same municipio — is the story everyone expects and the one I could
least verify (see below). Ensenada punches above its data weight nationally: two of its cafés
made a 2025 Top 50 of Mexican coffee shops.

**Stories.**
- **Barra D'Café (Av. Miramar 666, Zona Centro)** — named one of Mexico's best cafés in
  "The Best Coffee Shops México" 2025 list, cited for multiple brew methods, espresso and
  house-roasted beans; one of two Ensenada entries in the top 50.
  [San Diego Red, 17 Dec 2025](https://www.sandiegored.com/en/news/baja-california-cafes-earn-four-spots-among-mexicos-best-coffee-shops-in-2025/)
- **Xcaanda Coffee Bar & Roasters (Av. Blancarte 1076)** — the second Ensenada entry on
  the same 2025 list: a café that roasts its own beans rather than buying them.
  [San Diego Red, 17 Dec 2025](https://www.sandiegored.com/en/news/baja-california-cafes-earn-four-spots-among-mexicos-best-coffee-shops-in-2025/)
- **CESBC, the Baja California sommelier school (14 Aug 2018)** — opened in the Ensenada
  Business Center with six students in its sommelier diploma; it is a training
  institution, not a café, but it is the piece of infrastructure a local coffee scene
  needs and rarely gets.
  [Revista Molcajete](https://revistamolcajete.com/cesbc-elevando-el-conocimiento-en-apreciacion-de-bebidas-en-baja-california/)

**Chart hook.** "The map has 27 cafés in a municipio of 14,899 km² — 13 of them with a
street address": a completeness bar per city (share of shops with an address, share with
a website, share with Instagram) tells the Ensenada story better than any density figure,
because density here is a scraping artefact.

**Not verified.** The wine-country crossover is the obvious story and the weakest
evidence: Das Cortez, the Tijuana café/roaster brand, is listed as operating inside Finca
Altozano in the Valle de Guadalupe
([Wanderlog listing](https://wanderlog.com/place/details/446065/das-cortez)), but I found
no company or news source confirming it. Also unresolved: whether the OSM "Ensenada"
polygon is the city or the whole municipio — 27 shops across 14,899 km² suggests the
latter, which makes the per-km² figure meaningless.

---

## Guadalajara — 201 shops, 1.33/km²

**Scene.** Guadalajara's coffee story is unusually old and unusually quiet: a roaster from
1938 still supplies the city, a 1959 café in the centre still has its original furniture, and the specialty layer is
recent: the best-documented early bar, palReal, dates to 2014, and the newer ones cluster
in Colonia Americana and along Chapultepec. In 2025 one of those specialty bars reached a
global ranking. The map's 201 shops are dominated by chains (28 Starbucks, 12 La Flor de
Córdoba under two spellings), which understates how concentrated the interesting cafés
are in a few blocks.

**Stories.**
- **Café La Flor de Córdoba (1938)** — began on the corner of Santa Mónica and
  Independencia, roasts Mexican green coffee in its own Guadalajara plant and sells
  through more than 100 points of sale; it is the city's living link to the
  pre-specialty era.
  [cafelaflordecordoba.com](https://www.cafelaflordecordoba.com/en/pages/nuestro-legado)
- **Café Madoka (1959)** — at Enrique González Martínez 78 in the Centro, the café Juan
  Rulfo reportedly used to sit in around eight at night with an espresso and a Coke,
  reading until ten; it still has the original furniture and an old machine on the bar.
  [Guadalajara Secreta, Nov 2025](https://guadalajarasecreta.com/cafeteria-favorita-juan-rulfo-guadalajara/)
- **palReal (2014)** — a specialty café in Guadalajara that Daily Coffee News profiled at
  its fifth anniversary in 2019, with a two-time national barista champion running the
  bar; the piece is the best available account of how specialty arrived in the city.
  [Daily Coffee News, 20 Mar 2019](https://dailycoffeenews.com/2019/03/20/hasta-guadalajara-y-de-ahi-palreal/)
- **El Terrible Juan Café (ranked #51, 2025)** — placed 51st in The World's 100 Best
  Coffee Shops, the first edition of a global list judged in Madrid; the local coverage
  treats it as the city's arrival on the international map.
  [Telediario, 17 Mar 2025](https://www.telediario.mx/comunidad/cafeteria-guadalajara-cual-esta-entre-las-100-mejores-del-mundo)
- **The 2025 expansion** — a November 2025 round-up describes new specialty bars opening
  in Chapultepec and Americana, which is the "scene is accelerating" claim in local
  press rather than in a trade journal.
  [Debate, 13 Nov 2025](https://www.debate.com.mx/nueve-cafeterias-de-especialidad-en-guadalajara-en-tendencia-t202511130031.html)

**Chart hook.** "The second-most-repeated café name in Guadalajara is a roaster founded in
1938": La Flor de Córdoba appears 12 times (six as "Café la Flor de Córdoba", six as "La
Flor de Córdoba") against Starbucks' 28 — a name-repetition chart that shows a
pre-specialty brand still holding shelf space in a third-wave city.

**Not verified.** I could not source a founding year or owner for El Terrible Juan beyond
the ranking story. The claim that Guadalajara's specialty scene "began" with palReal is
not established — palReal is simply the best-documented early example.

---

## Los Angeles — 1,170 shops, 0.96/km²

**Scene.** LA's third wave arrived as an import and then localized. Intelligentsia opened
its first café outside Chicago at Sunset Junction in 2007 and trained a generation of
baristas who then built their own shops (Go Get Em Tiger, 2013). The other LA story is
Latinx coffee: Tierra Mia, founded in South Gate in 2008, built a chain on drinks like the
horchata latte in working-class Latino neighbourhoods, and is now expanding into San Diego
County. In 2025 the era-defining shop of Downtown's Spring Street closed after a decade,
while a Berlin roaster opened its first US café in the Arts District.

**Stories.**
- **Intelligentsia, Silver Lake (17 Aug 2007)** — the Chicago roaster's first café outside
  Chicago, at Sunset Junction; the LA Times called it a testing ground for progressive
  coffeehouse ideas.
  [Wikipedia](https://en.wikipedia.org/wiki/Intelligentsia_Coffee_%26_Tea) ·
  [LA Times, 29 Apr 2009](https://www.latimes.com/archives/la-xpm-2009-apr-29-fo-intelligentsia29-story.html)
- **Tierra Mia Coffee (2008, South Gate)** — Ulysses Romero's chain, founded in South Gate
  in 2008, is the reference case for Mexican-American specialty coffee in LA; the horchata
  latte is its signature. It opened its first San Diego County shop in Oceanside in
  February 2026 to queues.
  [PBS SoCal](https://www.pbssocal.org/food-discovery/food/food-tour-8-must-try-restaurants-in-southeast-l-a-county) ·
  [San DiegoVille, Feb 2026](https://www.sandiegoville.com/2026/02/massive-lines-greet-tierra-mia-coffees.html)
- **Go Get Em Tiger (2013, Larchmont)** — Kyle Glanville and Charles Babinski, both ex-
  Intelligentsia, opened GGET on Larchmont in 2013 after running G&B at Grand Central
  Market; it is the template for the LA multi-shop group.
  [gget.com](https://gget.com/) ·
  [LA Times, 23 Jun 2013](https://www.latimes.com/food/dailydish/la-dd-go-get-em-tiger-coffee-shop-larchmont-20130623-story.html)
- **Verve Coffee Roasters, Downtown (Jan 2015 – 1 Jun 2025)** — the Santa Cruz roaster's
  Spring Street espresso bar closed after a decade; Eater called it "era-defining" for
  Downtown's third wave.
  [Eater LA, 28 May 2025](https://la.eater.com/2025/5/28/24438781/verve-coffee-roasters-closing-downtown-los-angeles)
- **Concierge Coffee (spring 2024)** — a Berlin café and roaster opened its first US
  location at 821 Traction Ave in the Arts District, the reverse-direction import story.
  [Eater LA, 8 May 2024](https://la.eater.com/2024/5/8/24146631/concierge-coffee-shop-los-angeles-arts-district-cafe-berlin-germany) ·
  [Daily Coffee News, 28 Aug 2024](https://dailycoffeenews.com/2024/08/28/germanys-concierge-coffee-makes-permanent-arrangements-in-la/)

**Chart hook.** "One in five LA cafés is a Starbucks": 232 of 1,170 entries are named
exactly Starbucks, with Coffee Bean & Tea Leaf second at 40 — a chain-share bar where LA
looks more like Austin than like the Bay Area, and the specialty map is a thin layer on
top.

**Not verified.** Tierra Mia's "horchata latte as signature" is supported by PBS SoCal's
food tour, not by the company. Alfred Coffee is often dated 2012 in listicles; its own
site says 2013 on Melrose Place, so I left it out rather than pick a date.

---

## Mexico City — 1,051 shops, 0.71/km²

**Scene.** Mexico City has the deepest café culture on this map and the newest specialty
scene on top of it. The old layer is institutional: Café El Jarocho in Coyoacán (1953),
Café La Habana near Bucareli (1952), and the café de olla tradition of cinnamon and
piloncillo that Mexican food writing dates to the Revolution
([México Desconocido](https://www.mexicodesconocido.com.mx/el-cafe-de-olla-una-tradicion-surgida-durante-la-revolucion-mexicana.html)).
The new layer started around 2012 in Condesa and Roma and has since become one of the fastest-growing café markets in the Americas — one roaster
puts it at more than 600 new shops between 2021 and 2025, concentrated in Cuauhtémoc at
roughly 47 cafés per square kilometre.

**Stories.**
- **Café El Jarocho (1953)** — Gil Romero and Bertha Paredes started it from a grocery in
  Coyoacán; it now has nine branches run by their children and is the city's most
  legible family coffee institution.
  [Wikipedia](https://en.wikipedia.org/wiki/Caf%C3%A9_El_Jarocho)
- **Café La Habana (1952)** — founded by a Spaniard as a meeting place for Cubans near
  Morelos and Bucareli; it became the exile café where Che Guevara and Fidel Castro are
  said to have talked through the Cuban revolution.
  [El Financiero, 20 Sep 2025](https://www.elfinanciero.com.mx/food-and-drink/2025/09/20/la-historia-del-cafe-la-habana-restaurante-visitado-por-el-che-guevara-y-fidel-castro/)
- **Chiquitito Café (2012, Condesa)** — Jeremy Clouser and Cecilia Morales opened the
  original in a tiny Condesa space in 2012; the name means "little one", and it is the
  shop most often credited with starting the specialty wave.
  [Barista Magazine, Oct 2026](https://www.baristamagazine.com/specialty-coffee-shines-at-the-heart-of-mexico-city/)
- **Buna (2012, Roma Norte)** — founded by three childhood friends, roasts Mexican
  single-origin coffee in the city and is one of Roma's first specialty shops.
  [day9.coffee](https://www.day9.coffee/roasters/buna/) ·
  [Planazo](https://www.planazo.com.mx/lugares/buna)
- **The 2021–2025 boom** — Buna's Alberto (per Barista Magazine) reports more than 600 new
  coffee shops in the city between 2021 and 2025, with about 47 cafés per km² in
  Cuauhtémoc; the same piece documents the taco-stand espresso bar (Tormenta) and the
  retro standing bar (El Minutito).
  [Barista Magazine, Oct 2026](https://www.baristamagazine.com/specialty-coffee-shines-at-the-heart-of-mexico-city/)

**Chart hook.** "Cuauhtémoc has roughly 47 cafés per km² while the city average is 0.71":
plot our measured density per borough against the trade-press figure and the gap is the
story — the map's CDMX is a downtown map, not a city map.

**Not verified.** The 600-shop figure is one roaster's estimate quoted in a magazine, not a
census. Buna's founding year comes from specialty directories (2012), not from the
company's own site. La Habana's Che/Fidel story is tradition repeated by the press; I
found no contemporaneous document.

---

## New York City — 2,670 shops, 3.43/km²

**Scene.** New York's coffee history is longer than its specialty scene and both are
visible at once: a 1907 importer still roasting on Bleecker Street, a 1927 MacDougal
Street café that claims the first cappuccino in America, and a 2001 East Village shop that
made manual espresso the whole point. The 2010s added roaster-cafés with direct
farm relationships (Devoción, 2006) and then, in 2020, the venture-funded micro-shop:
Blank Street, small-format and tech-forward, which raised $25M in 2021 with plans for 100
small-format shops.

**Stories.**
- **Caffè Reggio (1927)** — opened at 119 MacDougal Street; its founder Domenico Parisi is
  credited with introducing cappuccino to America in the early 1920s, and the original
  espresso machine is still against the back wall.
  [Wikipedia](https://en.wikipedia.org/wiki/Caffe_Reggio) ·
  [caffereggio.com](https://www.caffereggio.com/)
- **Porto Rico Importing Co. (1907)** — 117 years on Bleecker Street at the time of
  Forbes' 2024 profile, still roasting and still wholesaling to New York restaurants.
  [Forbes, 8 May 2024](https://www.forbes.com/sites/garystern/2024/05/08/porto-rico-importing-hybrid-coffee-bean-business-thriving-in-greenwich-village-for-over-a-century/)
- **Ninth Street Espresso (2001)** — opened as Higher Grounds Cafe on 9th and Avenue C in
  2001, renamed in 2003, and was among the first New York shops to make manual espresso
  the primary offer; a 2002 New York Times piece ranked it among the city's best.
  [ninthstreetespresso.com](https://ninthstreetespresso.com/pages/copy-of-about-us)
- **Devoción (2006)** — Steven Sutton launched it to roast Colombian coffee in Brooklyn
  and get it from origin to cup in as little as ten days, the freshness pitch that became
  the brand.
  [devocion.com/pages/our-story](https://www.devocion.com/pages/our-story)
- **Blank Street (2020)** — founded in Williamsburg in May 2020, raised $25M in October
  2021 with plans for 100 small-format shops, and became the shorthand for
  venture-scaled coffee in the city.
  [Wikipedia](https://en.wikipedia.org/wiki/Blank_Street_Coffee) ·
  [Daily Coffee News, 13 Oct 2021](https://dailycoffeenews.com/2021/10/13/new-york-coffee-startup-blank-street-lands-25-million-plans-100-small-shops/)

**Chart hook.** "One East Village ZIP out-cafés the busiest ZIP in Seattle or San
Francisco": 10003 holds 73 mapped cafés, against 61 in Seattle's 98122 and 50 in SF's
94122 — a single bar chart that makes New York's density argument without a per-capita
adjustment.

**Not verified.** Blank Street's current store count and whether the 100-shop plan was
met — I only have the 2021 funding announcement. The "first cappuccino in America" is the
café's own claim.

---

## Oakland — 385 shops, 2.66/km²

**Scene.** Oakland is where the third wave's most consequential company started and where
it has since retreated. Blue Bottle began in 2002 as James Freeman's kiosk, was credited
with introducing pour-over to a US audience, sold 68% to Nestlé in 2017, and closed its
café in the W.C. Morse building in Temescal in September 2025 after 11 years; in March
2026 Nestlé sold the business to Centurium Capital for a reported ~$400M. Alongside it,
Red Bay Coffee (2014) built a Black-owned, Oakland-rooted roastery with a different growth
model. The chain map is still Peet's and Starbucks, twenty each.

**Stories.**
- **Blue Bottle Coffee (2002)** — founded in Oakland by James Freeman, who started selling
  coffee from a kiosk; credited with helping launch the US third wave by brewing pour-over
  to order.
  [Berkeleyside, 14 Sep 2017](https://www.berkeleyside.org/2017/09/14/blue-bottle-sell-majority-stake-nestle-hq-will-stay-oakland)
- **Nestlé buys 68% (2017)** — the deal that turned the Oakland roaster into a Nestlé
  subsidiary while keeping the headquarters in Oakland.
  [Berkeleyside](https://www.berkeleyside.org/2017/09/14/blue-bottle-sell-majority-stake-nestle-hq-will-stay-oakland)
- **W.C. Morse café closes (Sep 2025)** — Blue Bottle left the historic W.C. Morse
  building in Temescal after 11 years, part of a run of Bay Area closures.
  [Berkeleyside, 13 Oct 2025](https://www.berkeleyside.org/2025/10/13/seoul-hotdog-roasted-raw-riggers-loft-blue-bottle) ·
  [SFGATE, 4 Nov 2025](https://www.sfgate.com/food/article/sf-blue-bottle-near-mission-rock-neighborhood-21136023.php)
- **Sold again (Mar 2026)** — Nestlé agreed to sell Blue Bottle to Centurium Capital, the
  Luckin Coffee backer, for a reported ~$400M; the LA Times headline calls it "Oakland-born".
  [Caixin, 5 Mar 2026](https://www.caixinglobal.com/2026-03-05/luckin-backer-centurium-capital-to-buy-blue-bottle-coffee-from-nestl-102419511.html) ·
  [LA Times, 6 Mar 2026](https://www.latimes.com/business/story/2026-03-06/blue-bottle-is-reportedly-being-sold-to-chinese-investment-firm)
- **Red Bay Coffee (2014)** — Keba Konte founded it in 2014 as a Black-owned, Oakland-based
  roaster with a diversity-and-equity mission; it moved into an international headquarters
  on International Boulevard in 2019.
  [redbaycoffee.com/pages/our-story](https://www.redbaycoffee.com/pages/our-story) ·
  [redbaycoffee.com/pages/hq](https://www.redbaycoffee.com/pages/hq)

**Chart hook.** "Oakland's two most common café names are Peet's and Starbucks, twenty
each": a chain-mix chart where the birthplace of Blue Bottle is still a Peet's town — and
the punchline is that our busiest ZIP, 94704 (27 cafés), is in Berkeley.

**Not verified / data problem.** The Oakland layer includes Berkeley. ZIP 94704 is
Berkeley's downtown/Southside, and 27 cafés there outnumber any Oakland ZIP (94607 has
12). Any Oakland ZIP chart must either exclude 947xx or be labelled "Oakland + Berkeley".
I could not find a source for Blue Bottle's original Grand Lake farmers'-market pitch —
Berkeleyside only says "a kiosk" — so the farmers-market detail is left out.

---

## San Diego — 674 shops, 0.80/km²

**Scene.** San Diego's coffee story is a story about roasting, not cafés. Pannikin opened
in La Jolla in 1968 and is believed to be the first modern-era roaster in the county; by
2007 there were "three or four" local roasters and today there are well over 100. Bird
Rock (2002) and Café Moto (1990) are the two names that come up as the city's roasting
ancestors; Dark Horse and James Coffee (both 2013) are the café generation that followed.
The border is the other half of the story: San Diego is the closest major US city to a
coffee-producing country, and Baja roasters now travel north for cuppings.

**Stories.**
- **Pannikin Coffee & Tea (1968, La Jolla)** — opened by Gay and Bob Sinclair and believed
  to be San Diego's first modern-era coffee roaster; it sold wholesale and retail and
  imported tea, coffee and Mexican cocoa.
  [San Diego Magazine, 2026](https://sandiegomagazine.com/food-drink/the-locals-guide-to-san-diego-coffee/)
- **Bird Rock Coffee Roasters (2002)** — Chuck Patton started roasting in the La Jolla
  neighbourhood the company is named after; Roast Magazine named it Micro Roaster of the
  Year in 2012.
  [City of San Diego notice (PDF)](https://www.sandiego.gov/sites/default/files/oct._21_bird_rock_coffee_roasters_and_pinpoint_cafe.pdf) ·
  [birdrockcoffee.com](https://www.birdrockcoffee.com/pages/learn-more)
- **Café Moto (1990, Barrio Logan)** — a solar-powered roastery whose family has been
  roasting in San Diego since the late 1960s; the 34-year-old Barrio Logan HQ is still the
  wholesale engine behind much of the local café scene.
  [cafemoto.com/about/history](https://cafemoto.com/about/history/) ·
  [San Diego Union-Tribune, 12 Jul 2024](https://www.sandiegouniontribune.com/2024/07/12/21-unique-san-diego-coffee-experiences/)
- **Dark Horse (2013, Normal Heights) / James Coffee (2013, Little Italy)** — the two 2013
  openings that define the current café layer: brothers Bryan and Daniel Charlson on Adams
  Avenue, and David James Kennedy roasting from a North County garage before moving into
  Little Italy.
  [darkhorsecoffeeroasters.com](https://www.darkhorsecoffeeroasters.com/normal-heights) ·
  [San Diego Magazine, 15 Nov 2013](https://sandiegomagazine.com/food-drink/incoming-james-coffee-co/)
- **The border as origin** — San Diego is the closest major US city to a coffee-producing
  country; Baja roasters are beginning to attend and host cuppings in the city, and local
  roasters went from three or four in 2007 to well over 100.
  [San Diego Magazine, 2026](https://sandiegomagazine.com/food-drink/the-locals-guide-to-san-diego-coffee/)

**Chart hook.** "San Diego has nearly as many cafés as Seattle — 674 against 773 — at less
than a quarter of the density": 0.80/km² against Seattle's 3.56, because the city's
842 km² includes miles of suburb; a density-vs-count scatter makes the point that the map
measures municipal area, not walkable neighbourhoods.

**Not verified.** Bird Rock's exact opening year is 2002 per the city notice and Food GPS,
though the company's own "about" page does not state a year. I did not verify the
"first modern-era roaster" claim beyond San Diego Magazine's "believed to be".

---

## San Francisco — 786 shops, 6.47/km²

**Scene.** San Francisco is the densest coffee city on the map and the one where the
third wave became a brand. Blue Bottle's 2005 Hayes Valley kiosk, Ritual's 2005 Mission
shop and Philz's 2003 Mission storefront are the three founding addresses; Trouble Coffee
in the Outer Sunset turned a window on Judah Street into the "$4 toast" era. Two of those
originals are gone — Philz closed its first shop in 2023, Trouble in 2022 — and the
density has moved west: the Sunset ZIP 94122 now holds 50 cafés, twice the
next-busiest ZIP in the city.

**Stories.**
- **Blue Bottle, Hayes Valley kiosk (23 Jan 2005)** — Freeman's first seven-day-a-week
  shop was a kiosk on Linden Street in Hayes Valley; he has said it took about $300 on day
  one and that every drink was made to order, "very different than what you could get in
  San Francisco at that time". The address is still 315 Linden St.
  [Behance interview with James Freeman](https://www.behance.net/blog/blue-bottle-founder-james-freemans-journey-from-mozart-to-cortados) ·
  [bluebottlecoffee.com](https://bluebottlecoffee.com/us/eng/cafes/kiosk)
- **Philz Coffee (2003 → closed 16 Oct 2023)** — Phil and Jacob Jaber opened in the Mission
  in 2003; the original at 24th and Folsom closed two decades later, by then a chain
  reaching Chicago.
  [SF Examiner, Aug 2023](https://www.sfexaminer.com/news/business/philz-coffee-closing-original-sf-mission-location-in-october/article_5cc24d8a-3174-11ee-9dfd-079e226b3f7e.html) ·
  [NBC Bay Area](https://www.nbcbayarea.com/news/local/philz-coffee/106204/)
- **Trouble Coffee (2007 – 29 Jun 2022)** — Giulietta Carrelli's Outer Sunset window at
  4033 Judah Street, open 15 years, credited with launching the artisanal-toast craze
  before closing in 2022.
  [SFist, 30 Jun 2022](https://sfist.com/2022/06/30/trouble-coffee-which-helped-launch-the-artisan-toast-craze-i/)
- **Ritual Coffee Roasters (2005)** — Eileen Hassi Rinaldi founded it in 2005 in San
  Francisco; it is the roaster most often named alongside Blue Bottle as the city's
  third-wave origin.
  [Wikipedia](https://en.wikipedia.org/wiki/Ritual_Coffee_Roasters)
- **The Sunset's café density** — 94122 holds 50 of the city's 786 cafés, twice the second
  ZIP (94107, 25); citywide the median café is 71 m from the next one.
  [repo data: `shops.geojson`]

**Chart hook.** "A café every 71 metres, and the Sunset owns the map": bar chart of cafés
per ZIP with 94122 at 50 against a city median of 10, plus the median-nearest-neighbour
figure per neighbourhood — the "café every 108 m" line becomes defensible if we publish
the metric (straight-line median, not walking distance).

**Not verified.** The popular "café every 108 m" figure — I could not reproduce it from
the exported data; our straight-line median is 71 m, and a walking-distance figure would
be longer. Use our number and name the method rather than quoting 108 m.

---

## Seattle — 773 shops, 3.56/km²

**Scene.** Seattle's claim to be the US coffee capital rests on three layers: the
1887 roaster and 1908 Manning's chain, the 1971 Pike Place Starbucks, and the 1988
Espresso Vivace, where David Schomer worked out the espresso and milk technique that
became latte art. The city's own trade press argues Vivace, not Starbucks, "made coffee
huge in Seattle". The 2020s reversal is stark: on 25 September 2025 Starbucks closed both
of its Seattle Reserve locations — the Capitol Hill Roastery and the SoDo store — plus its
flagship unionized café, and said its North American store count would fall by about 1%.

**Stories.**
- **Starbucks, Pike Place (30 Mar 1971)** — the three founders learned roasting from
  Peet's in Berkeley, planned the store through 1970 and opened near Pike Place Market on
  30 March 1971; for years it sold only Peet's beans, added brewed coffee in 1982, opened
  its first espresso bar in 1984, and was bought by Howard Schultz in 1987.
  [HistoryLink](https://www.historylink.org/File/22750)
- **Espresso Vivace (1988)** — David Schomer and Geneva Sullivan opened it in 1988;
  Schomer's writing on extraction and milk texture, and the rosetta, spread through the
  industry. The Seattle Times: he "made coffee huge in Seattle".
  [Wikipedia](https://en.wikipedia.org/wiki/Espresso_Vivace) ·
  [Seattle Times](https://www.seattletimes.com/pacific-nw-magazine/vivaces-david-schomer-is-on-a-mission-to-pour-the-perfect-cup-of-coffee/)
- **D. Davies & Co. (1887) and Manning's (1908)** — the city's first roaster and its first
  local chain of coffee shops, both predating the espresso era.
  [Eater Seattle](https://seattle.eater.com/maps/seattles-best-coffee-shops)
- **Reserve Roastery closes (25 Sep 2025)** — Starbucks shut both Seattle Reserve
  locations, including the Capitol Hill Roastery, and its flagship unionized café, as part
  of a restructuring expected to cost $1B and cut the North American store count by ~1%.
  [Reuters, 25 Sep 2025](https://www.reuters.com/business/starbucks-close-some-stores-part-restructuring-plan-2025-09-25/) ·
  [KIRO 7, 25 Sep 2025](https://www.kiro7.com/news/local/starbucks-permanently-closes-seattle-reserve-roastery/TH7LR3AXLFGZXGVU547EHPOGYQ/)
- **Ranked #1 coffee city (2025)** — after losing a ranking earlier in the year, Seattle
  took first in WalletHub's coffee-city study, which weighs price, access and consumption.
  [Seattle Times](https://www.seattletimes.com/seattle-news/seattle-is-back-on-top-were-ranked-the-no-1-coffee-city-in-the-country/)

**Chart hook.** "Capitol Hill's 98122 has 61 cafés, more than any ZIP in San Francisco or
San Diego": a ZIP-density bar that also shows Seattle's chain share is low (56 Starbucks,
7.2%) compared with LA or Austin — the city with the most famous chain has one of the
least chain-dominated maps.

**Not verified.** The 1887 D. Davies date and 1908 Manning's date come from a single
Eater Seattle line. The Starbucks Reserve Roastery's opening year is not in the sources I
kept, so it is omitted rather than guessed.

---

## Tijuana — 627 shops, 0.51/km²

**Scene.** Tijuana's specialty scene is small, young and unusually well documented for its
size — and it is the most Instagram-visible city on the map at 18.7% of shops. Roasters
here tend to source Mexican coffee only, cafés stay open until 8 or 10pm and function as
third places rather than laptop offices, and espresso drinks sit around $2. The scene's
own narrative is cross-border: San Diego baristas discovered Tijuana at latte-art
throwdowns, and Tijuana roasters now travel north to cup. In December 2025 four Baja
cafés made a national top 50, two of them in Tijuana.

**Stories.**
- **Sur a Norte Coffee Roasters (by 2015)** — a wholesale roaster on the edge of Centro
  with a 25-kilo roaster made in Veracruz, sourcing almost entirely Mexican coffee; the
  clearest portrait of the scene's early infrastructure.
  [Fresh Cup, 24 Feb 2015](https://freshcup.com/espressos-in-the-borderland/)
- **Nativo Coffee Community** — a block from the PedWest crossing, serving cold drinks in
  cactus-shaped mason jars to people recovering from "the line", with a weekend farmers'
  market outside; the guide's recommended first stop on a TJ café crawl.
  [Sprudge, 25 Feb 2019](https://sprudge.com/the-coffee-drinkers-guide-to-tijuana-mexico-137475.html)
- **Caffé Sospeso** — run by Alberto Song, a Q grader and Cup of Excellence judge, roasting
  an international selection and serving Kyoto-style cold brew; on the 2025 national top
  50.
  [Sprudge](https://sprudge.com/the-coffee-drinkers-guide-to-tijuana-mexico-137475.html) ·
  [San Diego Red, 17 Dec 2025](https://www.sandiegored.com/en/news/baja-california-cafes-earn-four-spots-among-mexicos-best-coffee-shops-in-2025/)
- **Das Cortez → Baristas Bravos** — Baristas Bravos is the coffee bar spun out of the Das
  Cortez project; it made the same 2025 top 50, which gives Tijuana two of Baja's four
  slots.
  [San Diego Red, 17 Dec 2025](https://www.sandiegored.com/en/news/baja-california-cafes-earn-four-spots-among-mexicos-best-coffee-shops-in-2025/)
- **The scene's shape** — Mexican beans, late closing times (8–10pm), a genuine third-place
  culture and ~$2 espresso drinks, per Sprudge's city guide.
  [Sprudge, 25 Feb 2019](https://sprudge.com/the-coffee-drinkers-guide-to-tijuana-mexico-137475.html)

**Chart hook.** "Tijuana has the highest Instagram share on the map, 18.7% against 6.2% in
San Francisco and 1.7% in Mexico City": a share-of-shops-with-Instagram bar — but publish
it with the recon-coverage caveat, or it will read as a claim about Mexican cafés rather
than about our scrape.

**Not verified.** The Das Cortez café inside Finca Altozano (Valle de Guadalupe) is listed
by a directory but not confirmed by the company — see the Ensenada section. I could not
source opening years for Nativo, Sospeso or Baristas Bravos, so none are given. Tijuana's
Instagram share may be inflated by a completed `ig-recon` run relative to other cities.

---

## What is not verified, globally

- **Instagram share** measures capture effort as well as behaviour; only some cities have
  had a full `ig-recon` pass. Do not publish a cross-city ranking as a cultural claim.
- **Ensenada's 27 shops** are an OSM-only footprint and its area figure looks like the
  whole municipio, so both its density and its "no Instagram" status are artefacts.
- **Oakland's layer includes Berkeley**, visible in its busiest ZIP (94704).
- **Median-nearest-café distances** are straight-line, not walking; the app's existing
  "mean walk" label needs a method note if it goes on a card.
- **"Café every 108 m"** for San Francisco could not be reproduced; the exported data
  gives a 71 m straight-line median.
- **Chain counts** here are exact-name matches ("Starbucks"), so they undercount variants
  like "Starbucks Reserve" and overcount independent shops that reuse a chain's name.

## Method

Counts, ZIPs, Instagram shares and nearest-neighbour medians were computed from
`web-astro/public/data/shops.geojson` (8,681 features) and `meta.json`, using the address
field's last five-digit token as the postcode and haversine distance between shop
coordinates within each `city` value. No files outside `research/` were modified.
