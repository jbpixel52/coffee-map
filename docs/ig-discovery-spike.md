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
