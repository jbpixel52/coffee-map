# IG discovery spike — verdict: NO-GO (v1)

**Date:** 2026-10-19 (America/Tijuana) · **Probe:** `scripts/ig_discovery_probe.py`
**Question (T4.4):** can logged-out Instagram hashtag/location pages be used to
*discover* Tijuana cafés we don't already know?

## Method

One page load per URL, logged out, es-MX locale / America/Tijuana timezone,
archive-first (bytes saved under `data/archive/spike/`), then classify +
handle-extract from the archived bytes. Three tag pages:

| URL | classify | handles extractable | bytes |
|---|---|---|---|
| `/explore/tags/cafetijuana/` | `login_required` | 0 | 391,456 |
| `/explore/tags/cafesdetijuana/` | `login_required` | 0 | 391,274 |
| `/explore/tags/tijuanacoffee/` | `login_required` | 0 | 391,273 |

## Evidence from the archived bytes

Each page is a real login wall, not a redirect stub:

- one `<input type="password">` present,
- 76 references to `accounts/login`,
- **zero** `xig_user_by_username` payloads (the profile-page channel that
  recon uses does not exist here),
- no extractable profile handles.

Contrast with T4.3: profile pages (`instagram.com/<handle>/`) served a full
logged-out payload — 13/16 known handles recon'd with follower counts. The
tag surface is simply gated harder than the profile surface.

## Decision (per plan rule)

> any URL whose classify is `login_required`/`challenge` ⇒ no-go (record it,
> do not pursue with a session in v1)

**No-go for v1.** The map's social leg stays *enrichment-only*: OSM + Google
Maps find the shops, Instagram adds a profile handle + follower count to shops
already known. No `ig-discover` tier is built now.

## Revisit condition

Revisit only if the map needs shop discovery from social data *and* a logged-in
IG session is acceptable — an authenticated hashtag read is the documented next
step (`instagram-scraping` skill: hashtags reachable with a session, metrics
require one). Building that tier means owning a session's lifecycle
(mint → health-check → scrape → stop-on-challenge), which v1 deliberately does
not do.

## Addendum (2026-10-23): `ig-discover`, a different tier

A narrow, session-free discovery tier shipped later under the name
`coffeemap ig-discover`. It does **not** contradict the no-go above: it never
touches hashtag, location or explore surfaces, and it makes no new requests.
It re-reads profile pages that `ig-recon` already archived and extracts the
`"username":"…"` accounts those pages co-mention, queues them as
`candidates(kind='ig')`, and leaves them to `ig-recon → classify → attach`.
The no-go still stands for hashtag/location discovery; this tier is
enrichment-of-the-enrichment, and every suggested handle is recon'd and gated
exactly like any other candidate.

### First run (2026-10-23)

| step | result |
|---|---|
| `ig-discover` | 125 unseen handles queued (122 archived pages) |
| `ig-recon --limit 25` | 25 public profiles captured, 0 challenges |
| `ig-enrich` | 144 archived profiles re-parsed offline |
| `classify-candidates --kinds ig` | 124 `not_cafe`, 1 `cafe` (1.5B quirk: bare handles read as non-cafés) |
| `ig-attach` | 166 pairs, **+1 new link** on a shop (~1 per 100 suggestions) |
| `export` | `with_instagram` 119 → 120 of 608 (`web-astro/public/data/meta.json`) |

A second `ig-discover` immediately afterwards queued 26 more handles — those
come from the 25 profiles just fetched, so the loop keeps producing candidates
as the archive grows. The SQLite rows live in `data/` (gitignored by design);
`meta.json` is the committed witness of the effect.

No SERP/Google-Maps discovery ran that day: the local `fastCRW` search service
(`:3000`) was unreachable, so `web-search` / `web-scrape` / `gmaps-fetch` were
skipped and only the offline path was exercised.
