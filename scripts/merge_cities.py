"""Combine per-city exports into the one file the map ships.

Each city exports into its own directory (data/export/<slug>/) with the env
overrides in config.py; this stitches them together, tags every feature with its
city, and writes web-astro/public/data/{shops.geojson,meta.json}.
"""
from __future__ import annotations

import json
import sys
import sys as _sys

_sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1] / 'src'))
from coffeemap.merge import (  # noqa: E402
    drop_cross_city_duplicates,
    reassign_by_bbox,
    reassign_by_postcode,
)
from pathlib import Path
import tomllib  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
EXPORT_ROOT = ROOT / "data" / "export"
OUT_DIR = ROOT / "web-astro" / "public" / "data"


def load_city(slug_dir: Path) -> tuple[str, list[dict], dict]:
    meta = json.loads((slug_dir / "meta.json").read_text(encoding="utf-8"))
    fc = json.loads((slug_dir / "shops.geojson").read_text(encoding="utf-8"))
    for f in fc["features"]:
        f["properties"]["city"] = meta["city"]
        f["properties"]["city_slug"] = slug_dir.name
    return meta["city"], fc["features"], meta


def city_bboxes() -> dict[str, tuple[float, float, float, float]]:
    """City name -> union of its bbox tiles (CDMX and NYC are fetched as two)."""
    out: dict[str, tuple[float, float, float, float]] = {}
    for cfg in (ROOT / "config").glob("city*.toml"):
        raw = tomllib.loads(cfg.read_text(encoding="utf-8"))
        try:
            box = (raw["bbox_south"], raw["bbox_west"], raw["bbox_north"], raw["bbox_east"])
        except KeyError:
            continue
        name = raw.get("name")
        if not name:
            continue
        if name in out:
            s0, w0, n0, e0 = out[name]
            box = (min(s0, box[0]), min(w0, box[1]), max(n0, box[2]), max(e0, box[3]))
        out[name] = box
    return out


def main() -> int:
    dirs = sorted(d for d in EXPORT_ROOT.glob("*") if (d / "shops.geojson").exists())
    if not dirs:
        print(f"merge-cities: no exports under {EXPORT_ROOT}", file=sys.stderr)
        return 1

    features: list[dict] = []
    generated = ""
    by_name: dict[str, dict] = {}
    for d in dirs:
        name, feats, meta = load_city(d)
        features.extend(feats)
        generated = max(generated, meta.get("generated_at", ""))
        # a dense city can be fetched as several bbox tiles; they add up to one city
        entry = by_name.setdefault(
            name,
            {"name": name, "slug": d.name, "shop_count": 0, "with_instagram": 0,
             "population": 0, "area_sq_km": 0.0},
        )
        entry["shop_count"] += meta["shop_count"]
        entry["with_instagram"] += meta["with_instagram"]
        # tiles of one city repeat the same city-wide figures: keep the first non-zero
        entry["population"] = entry["population"] or meta.get("population", 0)
        entry["area_sq_km"] = entry["area_sq_km"] or meta.get("area_sq_km", 0.0)
    cities = list(by_name.values())

    # A dense city is fetched as bbox tiles; the same OSM feature can land in two
    # of them. Same name at the same coordinates is the same café.
    seen: set[tuple] = set()
    unique: list[dict] = []
    for f in features:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        key = (p["city"], p["name"].strip().lower(), round(lat, 5), round(lon, 5))
        if key in seen:
            continue
        seen.add(key)
        unique.append(f)
    bboxes = city_bboxes()
    features = drop_cross_city_duplicates(unique, bboxes)
    by_bbox = reassign_by_bbox(features, bboxes)
    if by_bbox:
        print(f"merge-cities: {by_bbox} shops moved to the city whose bbox contains them")
    moved = reassign_by_postcode(features, bboxes)
    if moved:
        print(f"merge-cities: {moved} shops reassigned to the city that owns their postcode")
    features.sort(key=lambda f: (f["properties"]["city"], f["properties"]["name"].lower()))
    # Ids restart at 1 in every per-city export; the merged file needs one
    # namespace so React can key rows without reusing the wrong DOM node.
    for i, f in enumerate(features, start=1):
        f["properties"]["id"] = i
    # Per-city counts follow the de-duplicated merged features, not the
    # pre-dedupe per-tile totals.
    for entry in cities:
        in_city = [f for f in features if f["properties"]["city"] == entry["name"]]
        entry["shop_count"] = len(in_city)
        entry["with_instagram"] = sum(1 for f in in_city if f["properties"]["instagram"])
    cities.sort(key=lambda c: c["name"].lower())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "shops.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    meta = {
        "city": cities[0]["name"],
        "cities": cities,
        "generated_at": generated,
        "shop_count": len(features),
        "with_instagram": sum(1 for f in features if f["properties"]["instagram"]),
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        "merge-cities: "
        + ", ".join(f"{c['name']} {c['shop_count']}" for c in cities)
        + f" -> {len(features)} total ({meta['with_instagram']} with Instagram)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
