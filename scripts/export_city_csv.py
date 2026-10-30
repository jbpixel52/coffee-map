#!/usr/bin/env python3
"""Export one city as a flat CSV: name, location, social media.

    python3 scripts/export_city_csv.py tj            # -> data/reports/tj-shops.csv
    python3 scripts/export_city_csv.py tj --out /tmp/tj.csv

Reads the per-city export (data/export/<slug>/shops.geojson) so it reflects every source
that city has: OSM coordinates, Google Maps places, and the Instagram handle attached to
each shop. Columns are the ones a person actually wants to paste into a sheet.
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

COLUMNS = [
    "name",
    "address",
    "lat",
    "lon",
    "instagram",
    "ig_url",
    "followers",
    "website",
    "sources",
    "gmaps",
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", help="city export slug, e.g. tj")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    # The merged file is the truth that ships: it has cross-border rows resolved and
    # duplicates dropped. The per-city export is only a fallback for a city that has not
    # been merged yet.
    merged = ROOT / "web-astro" / "public" / "data" / "shops.geojson"
    src = merged if merged.exists() else ROOT / "data" / "export" / args.slug / "shops.geojson"
    if not src.exists():
        raise SystemExit(f"nothing to read at {src} — run `coffeemap export` and merge_cities first")
    feats = [
        f for f in json.loads(src.read_text(encoding="utf-8"))["features"]
        if src == merged and f["properties"].get("city_slug") == args.slug
    ] if src == merged else json.loads(src.read_text(encoding="utf-8"))["features"]

    out = Path(args.out) if args.out else ROOT / "data" / "reports" / f"{args.slug}-shops.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for f in feats:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        handle = p.get("instagram") or ""
        rows.append(
            {
                "name": p.get("name") or "",
                "address": p.get("address") or "",
                "lat": f"{lat:.6f}",
                "lon": f"{lon:.6f}",
                "instagram": f"@{handle}" if handle else "",
                "ig_url": f"https://www.instagram.com/{handle}/" if handle else "",
                "followers": p.get("ig_followers") or "",
                "website": p.get("website") or "",
                "sources": "+".join(p.get("sources") or []),
                "gmaps": "https://www.google.com/maps/search/?api=1&query="
                + (f"{lat:.6f},{lon:.6f}"),
            }
        )
    rows.sort(key=lambda r: r["name"].lower())
    with out.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS, delimiter=";")
        w.writeheader()
        w.writerows(rows)
    with_ig = sum(1 for r in rows if r["instagram"])
    print(f"{len(rows)} shops -> {out} ({with_ig} with an Instagram handle)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
