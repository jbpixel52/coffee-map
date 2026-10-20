"""Canonicalisation: collapse per-source `places` into `shops`."""
from __future__ import annotations

import sqlite3
import unicodedata
from difflib import SequenceMatcher
from math import asin, cos, radians, sin, sqrt

from .store import now_utc

MERGE_DISTANCE_M = 100.0
NAME_RATIO_MIN = 0.80


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


def rebuild_shops(con: sqlite3.Connection) -> tuple[int, int]:
    """Rebuild shops/shop_places from places. Returns (shops, merged_places)."""
    now = now_utc()
    places = [dict(r) for r in con.execute("SELECT * FROM places ORDER BY source, source_id")]
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
