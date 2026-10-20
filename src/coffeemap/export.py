"""Export canonical shops to web/public/data (GeoJSON + meta)."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .config import ROOT, City
from .store import now_utc

OUT_DIR = ROOT / "web" / "public" / "data"


def export(con: sqlite3.Connection, city: City) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = con.execute(
        """
        SELECT s.id, s.name, s.lat, s.lon,
               MAX(p.instagram) AS instagram,
               MAX(p.website)   AS website,
               GROUP_CONCAT(DISTINCT p.source) AS sources
        FROM shops s
        JOIN shop_places sp ON sp.shop_id = s.id
        JOIN places p ON p.id = sp.place_id
        WHERE s.name <> ''
        GROUP BY s.id
        ORDER BY s.name COLLATE NOCASE
        """
    ).fetchall()
    ig = {r["handle"]: r for r in con.execute("SELECT * FROM ig_profiles")}
    features = []
    for r in rows:
        igp = ig.get(r["instagram"]) if r["instagram"] else None
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "instagram": r["instagram"],
                "ig_followers": igp["followers"] if igp else None,
                "ig_last_post_at": igp["last_post_at"] if igp else None,
                "website": r["website"],
                "sources": (r["sources"] or "").split(","),
            },
        })
    (OUT_DIR / "shops.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    meta = {
        "city": city.name,
        "generated_at": now_utc(),
        "shop_count": len(features),
        "unnamed_excluded": con.execute(
            "SELECT COUNT(*) FROM shops WHERE name = ''"
        ).fetchone()[0],
        "with_instagram": sum(1 for f in features if f["properties"]["instagram"]),
    }
    (OUT_DIR / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return meta
