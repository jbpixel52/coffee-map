"""Combine per-city exports into the one file the map ships.

Each city exports into its own directory (data/export/<slug>/) with the env
overrides in config.py; this stitches them together, tags every feature with its
city, and writes web-astro/public/data/{shops.geojson,meta.json}.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

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


def main() -> int:
    dirs = sorted(d for d in EXPORT_ROOT.glob("*") if (d / "shops.geojson").exists())
    if not dirs:
        print(f"merge-cities: no exports under {EXPORT_ROOT}", file=sys.stderr)
        return 1

    features: list[dict] = []
    cities: list[dict] = []
    generated = ""
    for d in dirs:
        name, feats, meta = load_city(d)
        features.extend(feats)
        generated = max(generated, meta.get("generated_at", ""))
        cities.append(
            {
                "name": name,
                "slug": d.name,
                "shop_count": meta["shop_count"],
                "with_instagram": meta["with_instagram"],
            }
        )

    features.sort(key=lambda f: (f["properties"]["city"], f["properties"]["name"].lower()))
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
