"""Canonicalisation: collapse per-source `places` into `shops`."""
from __future__ import annotations

import re
import sqlite3
import unicodedata
from difflib import SequenceMatcher
from math import asin, cos, radians, sin, sqrt

from .store import now_utc

MERGE_DISTANCE_M = 100.0
NAME_RATIO_MIN = 0.80

# Tokens too generic to carry identity on their own.
STOP_TOKENS = {
    "cafe", "cafeteria", "coffee", "cafes", "de", "del", "la", "el", "los", "las",
    "y", "the", "shop", "bar", "mx", "mexico", "tijuana", "baja", "co", "and",
}


def norm_name(name: str) -> str:
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    folded = "".join(c.lower() if c.isalnum() else " " for c in name)
    return " ".join(folded.split())


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * r * asin(sqrt(a))


def should_merge(a: dict, b: dict) -> bool:
    if haversine_m(a["lat"], a["lon"], b["lat"], b["lon"]) > MERGE_DISTANCE_M:
        return False
    na, nb = norm_name(a["name"]), norm_name(b["name"])
    if not na or not nb:
        return False
    return na == nb or SequenceMatcher(None, na, nb).ratio() >= NAME_RATIO_MIN


def tokens(name: str) -> set[str]:
    """Identity-bearing tokens of a name ('Brewja Barra de Café' -> {brewja, barra})."""
    return {t for t in norm_name(name).split() if len(t) >= 2}


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def _fused_hit(tok: str, fused: str) -> bool:
    """tok appears in the fused string: exactly at 6+ chars, at a word edge at
    5 ('regor' is a prefix of 'regorcafe'), or with spelling support at 5+
    ('vortexcoffeehouse' ~ 'vorticecoffeehouse' at 0.91)."""
    if len(tok) >= 6 and tok in fused:
        return True
    if len(tok) >= 5 and (fused.startswith(tok) or fused.endswith(tok)):
        return True
    if len(tok) < 5 or not fused:
        return False
    return _ratio(tok, fused) >= 0.90


def token_covered(a: str, b: str, min_distinct_len: int = 4) -> bool:
    """Every distinctive token of the smaller string appears in the larger one.

    Handles brand-style names and Instagram handles: tokens may be split
    ('brewja' vs 'brewja.barradecafe'), fused ('Nativo Coffee Community' vs
    'nativocoffee'), reordered-fused ('Mujer Divina Brunch Cafe' vs
    'brunchmujerdivina'), or typo'd ('VÓRTICE COFFEE HOUSE' vs
    'vortexcoffeehouse'). Lone short tokens (4-5 chars) need spelling support
    ('lumi' vs 'lumicafemx_' passes, 'flor' vs 'florderquis' does not).
    """
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    if len(ta) <= len(tb):
        short, long_, long_s, short_s = ta, tb, b, a
    else:
        short, long_, long_s, short_s = tb, ta, a, b
    sdist, ldist = short - STOP_TOKENS, long_ - STOP_TOKENS
    if not sdist or not ldist:
        return False
    long_fused = "".join(norm_name(long_s).split())
    short_fused = "".join(norm_name(short_s).split())
    overall = _ratio(norm_name(a), norm_name(b))

    if all(t in long_ or _fused_hit(t, long_fused) for t in sdist):
        if len(sdist) > 1:
            return True
        lone = next(iter(sdist))
        side = norm_name(short_s)
        if lone == side and len(lone) >= min_distinct_len:
            return True  # a whole one-word name ('Lumi') inside the other side
        if len(lone) >= min_distinct_len + 2:  # a longer distinctive word ('munchiesicecream')
            return True
        if overall >= 0.65:
            return True

    if all(t in short_fused for t in ldist):
        lone = next(iter(ldist)) if len(ldist) == 1 else None
        if lone is None or len(lone) >= min_distinct_len + 2:
            return True
        if overall >= 0.65:  # 'lumi'@0.84 and 'valle'@0.90 pass; 'mundo'@0.56 fails
            return True
    return False


NAME_RATIO_STRICT = 0.92


def name_match(a: str, b: str, ratio_min: float = NAME_RATIO_MIN) -> bool:
    """Fuzzy identity between a place name and an ig handle / full name.

    - Near-identical spelling (ratio >= 0.92) is accepted outright.
    - Mid ratios (>= ratio_min) additionally require every distinctive word of
      the shorter side to be present as a word in the longer side: 'Punto
      Coffee Community' and 'Nativo Coffee Community' share a long suffix and
      float at ratio 0.82, but 'punto' is not in the other side.
    - Otherwise token coverage decides (handles fuse/reorder/truncate words).
    """
    na, nb = norm_name(a), norm_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    r = SequenceMatcher(None, na, nb).ratio()
    if r >= NAME_RATIO_STRICT:
        return True
    ta, tb = tokens(a), tokens(b)
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if r >= ratio_min and (short - STOP_TOKENS) and (short - STOP_TOKENS) <= long_:
        return True
    return token_covered(a, b)


def rebuild_shops(con: sqlite3.Connection) -> tuple[int, int]:
    """Rebuild shops/shop_places from places. Returns (shops, merged_places)."""
    now = now_utc()
    places = [
        dict(r)
        for r in con.execute(
            """SELECT * FROM places
               WHERE COALESCE(verdict, 'cafe') <> 'not_cafe'
               ORDER BY source, source_id"""
        )
    ]
    clusters: list[list[dict]] = []
    for p in places:
        for cluster in clusters:
            if any(should_merge(p, q) for q in cluster):
                cluster.append(p)
                break
        else:
            clusters.append([p])
    con.execute("DELETE FROM shop_places")
    con.execute("DELETE FROM shops")
    for cluster in clusters:
        best = next((m for m in cluster if m["source"] == "osm"), cluster[0])  # OSM-first geometry
        cur = con.execute(
            "INSERT INTO shops (name, lat, lon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (best["name"], best["lat"], best["lon"], now, now),
        )
        for m in cluster:
            con.execute(
                "INSERT INTO shop_places (shop_id, place_id) VALUES (?, ?)",
                (cur.lastrowid, m["id"]),
            )
    con.commit()
    return len(clusters), sum(len(c) - 1 for c in clusters)


# ── cross-city duplicates ────────────────────────────────────────────────────
# A city's scrape can reach across a border (Tijuana's Google Maps queries return
# Chula Vista cafés ~10 km north). Those shops then exist twice: correctly under
# San Diego, wrongly under Tijuana, at identical coordinates. Keep the claim whose
# postcode belongs to that city, drop the other.
DUP_DISTANCE_M = 40.0


def _zip_prefix(address: str | None) -> str | None:
    m = re.search(r"\b(\d{5})\b", address or "")
    return m.group(1)[:3] if m else None


def zip_prefix_owners(features: list[dict]) -> dict[str, str]:
    """Postcode prefix -> the city that claims it most often.

    Ownership by strongest claim rather than a share threshold: a handful of
    across-the-border shops must not make a foreign prefix look local.
    """
    counts: dict[str, dict[str, int]] = {}
    for f in features:
        prefix = _zip_prefix(f["properties"].get("address"))
        if not prefix:
            continue
        city = f["properties"]["city"]
        bucket = counts.setdefault(prefix, {})
        bucket[city] = bucket.get(city, 0) + 1
    return {prefix: max(bucket, key=lambda c: bucket[c]) for prefix, bucket in counts.items()}


def _inside(bbox: tuple[float, float, float, float] | None, lat: float, lon: float) -> bool:
    if not bbox:
        return False
    s, w, n, e = bbox
    return s <= lat <= n and w <= lon <= e


def drop_cross_city_duplicates(
    features: list[dict],
    bboxes: dict[str, tuple[float, float, float, float]] | None = None,
) -> list[dict]:
    """Drop a city's claim on a shop another city already owns at the same spot.

    Only features whose postcode is foreign to their own city are candidates, and a
    group is only resolved when exactly one claimant's postcode fits its city — an
    ambiguous pair is left alone rather than guessed at.

    When `bboxes` is given, a claim must also land inside its own city's box. Postcodes
    on OSM tags are sometimes simply wrong (a Tijuana café tagged with a Chula Vista
    ZIP), and a wrong postcode must not hand a shop to the wrong side of the border.
    """
    owners = zip_prefix_owners(features)
    groups: dict[tuple, list[dict]] = {}
    for f in features:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        key = (norm_name(p["name"]), round(lat, 4), round(lon, 4))
        groups.setdefault(key, []).append(f)

    drop: set[int] = set()
    for group in groups.values():
        cities = {f["properties"]["city"] for f in group}
        if len(cities) < 2:
            continue
        lon, lat = group[0]["geometry"]["coordinates"]

        def own_ground(f: dict) -> bool:
            return bboxes is None or _inside(bboxes.get(f["properties"]["city"]), lat, lon)

        fitting = [
            f
            for f in group
            if (owners.get(_zip_prefix(f["properties"]["address"])) or f["properties"]["city"])
            == f["properties"]["city"]
            and own_ground(f)
        ]
        if not fitting and bboxes is not None:
            # the postcode is no help here; coordinates still are
            fitting = [f for f in group if own_ground(f)]
        if not fitting or len(fitting) == len(group):
            continue
        for f in group:
            if f not in fitting:
                drop.add(id(f))
    return [f for f in features if id(f) not in drop]
