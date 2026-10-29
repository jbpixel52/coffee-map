"""Export canonical shops to web-astro/public/data (GeoJSON + meta)."""
from __future__ import annotations

import json
import re
import os
import sqlite3
from pathlib import Path

from .config import ROOT, City
from .store import now_utc

OUT_DIR = Path(os.environ.get("COFFEEMAP_OUT", ROOT / "web-astro" / "public" / "data"))


_HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def export(con: sqlite3.Connection, city: City) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = con.execute(
        """
        SELECT s.id, s.name, s.lat, s.lon,
               MAX(p.instagram) AS instagram,
               MAX(p.website)   AS website,
               MAX(p.address)   AS address,
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
        # A handle Instagram served as not_found is a dead link: the profile page 404s,
        # so shipping it puts a broken button on the card. The place keeps existing —
        # only the handle is withheld.
        dead = bool(igp and igp["capture_state"] == "not_found")
        # A handle that is not a handle (a post code, a pasted URL) becomes a broken button:
        # withhold it rather than link somewhere wrong.
        handle = r["instagram"] if r["instagram"] and _HANDLE_RE.match(r["instagram"]) else None
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "instagram": None if dead else handle,
                # a parsed 0 is a failed read, not an audience of nobody: ship null so the
                # card and the stats tab both treat it as unknown
                "ig_followers": igp["followers"]
                if igp and not dead and (igp["followers"] or 0) > 0
                else None,
                "ig_full_name": igp["full_name"] if igp and not dead else None,
                "ig_latest_code": igp["latest_code"] if igp and not dead else None,
                "ig_last_post_at": igp["last_post_at"] if igp and not dead else None,
                "website": r["website"],
                "address": r["address"],
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
        "population": city.population,
        "area_sq_km": city.area_sq_km,
    }
    (OUT_DIR / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return meta
