#!/usr/bin/env python
"""Generate static prettymaps (OSM) art for the coffee-map site.

Outputs (under web-astro/public/art/):
  - hero.png     : central Tijuana, ~2500 m radius, ~2000 px long edge
  - zone-<n>.png : posters for the top-N densest cafe grid cells (1200 m radius)
  - card.png     : portrait card of the densest cafe neighborhood

Run:  uv run python scripts/prettymaps_art.py

The prettymaps + OpenStreetMap credit line is drawn on every figure
(license requirement; do not disable the `credit` parameter).
"""

import json
import math
import sys
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless

import numpy as np
import osmnx as ox
import prettymaps

warnings.filterwarnings("ignore", message=".*Vsketch.*")

REPO = Path(__file__).resolve().parents[1]
SHOPS_GEOJSON = REPO / "web-astro" / "public" / "data" / "shops.geojson"
OUT_DIR = REPO / "web-astro" / "public" / "art"

# --- layout config ---------------------------------------------------------
HERO_CENTER = (32.5149, -117.0382)  # Zona Centro, Tijuana
HERO_RADIUS = 1500  # meters (kept small: 2500 m OOM-kills the 7 GB host)
HERO_FIGSIZE = (5.5, 5.5)  # inches * 300 dpi = 1650 px

ZONE_RADIUS = 1200  # meters
ZONE_FIGSIZE = (4.0, 4.0)  # 1200 px square
ZONE_SIZE = 0.018  # grid cell size in degrees (~2 km at TJ latitude)
N_ZONES = 3  # top cells by shop count (only cells with >= 3 shops)

CARD_RADIUS = 1100  # meters
CARD_FIGSIZE = (4.0, 5.0)  # 1200 x 1500 px portrait

MIN_SHOPS_PER_ZONE = 3

ox.settings.timeout = 300
ox.settings.overpass_rate_limit = True

# --- style: soft paper / watercolor palette to match the site --------------
CREAM = "#f8ead1"
INK = "#59524a"

STYLE = {
    "perimeter": {"fill": False, "lw": 0, "zorder": 0},
    "background": {"fc": CREAM, "zorder": -1},
    "green": {
        "fc": "#c9d2a8",
        "ec": "#a3b184",
        "hatch": None,
        "lw": 0.8,
        "zorder": 1,
    },
    "forest": {"fc": "#b3c69b", "ec": "#8fa87c", "lw": 0.8, "zorder": 2},
    "water": {
        "fc": "#bcd4d6",
        "ec": "#8fb0b5",
        "hatch": None,
        "lw": 0.8,
        "zorder": 3,
    },
    "beach": {"fc": "#eed9a8", "ec": "#d4bd8a", "hatch": None, "lw": 0.8, "zorder": 3},
    "parking": {"fc": "#e8dcc3", "ec": "#cbbfa4", "lw": 0.5, "zorder": 3},
    "streets": {"fc": INK, "ec": INK, "alpha": 0.85, "lw": 0, "zorder": 4},
    "building": {
        "palette": ["#d9b48f", "#c98a6b", "#b0715a", "#8f6a5a"],
        "ec": "#6b5748",
        "lw": 0.3,
        "zorder": 5,
    },
}

# Credit text itself is left at the prettymaps default (OSM + prettymaps),
# only the font/box are adapted to the cream palette.
CREDIT = {
    "fontfamily": "DejaVu Sans Mono",
    "bbox": {"boxstyle": "square", "fc": CREAM, "ec": INK},
}


def render(center, radius, figsize, out_path, circle=True):
    """Render one prettymaps figure; retry once with a smaller radius on failure."""
    for attempt, r in enumerate((radius, round(radius * 0.7)), start=1):
        try:
            np.random.seed(7)  # deterministic building palette picks
            prettymaps.plot(
                center,
                radius=r,
                circle=circle,
                figsize=figsize,
                style=STYLE,
                credit=CREDIT,
                save_as=str(out_path),
                show=False,
            )
            if attempt > 1:
                print(f"    (succeeded on retry with radius={r} m)")
            return out_path
        except Exception as exc:  # Overpass/osmnx/network failures land here
            if attempt == 2:
                raise
            print(f"    attempt 1 failed ({type(exc).__name__}: {exc}); retrying smaller")
    return out_path


def load_shop_points():
    data = json.loads(SHOPS_GEOJSON.read_text())
    pts = []
    for f in data["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        pts.append((lat, lon))
    return pts


def bucket_zones(points):
    """Bucket shops into ZONE_SIZE-degree grid cells; return cells sorted by count."""
    cells = {}
    for lat, lon in points:
        key = (math.floor(lat / ZONE_SIZE), math.floor(lon / ZONE_SIZE))
        cells.setdefault(key, []).append((lat, lon))
    zones = [
        (len(pts), np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts]))
        for pts in cells.values()
        if len(pts) >= MIN_SHOPS_PER_ZONE
    ]
    zones.sort(reverse=True)
    return zones  # (count, centroid_lat, centroid_lon)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    produced = []

    # (a) hero
    print(f"[hero] center={HERO_CENTER} radius={HERO_RADIUS} m")
    try:
        render(HERO_CENTER, HERO_RADIUS, HERO_FIGSIZE, OUT_DIR / "hero.png")
        produced.append(OUT_DIR / "hero.png")
    except Exception as exc:
        print(f"[hero] FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)

    # zones from shops.geojson
    points = load_shop_points()
    zones = bucket_zones(points)
    print(f"[zones] {len(points)} shops -> {len(zones)} eligible cells")

    # (b) zone posters
    for i, (count, lat, lon) in enumerate(zones[:N_ZONES], start=1):
        out = OUT_DIR / f"zone-{i}.png"
        print(f"[zone-{i}] {count} shops, centroid=({lat:.5f}, {lon:.5f})")
        try:
            render((lat, lon), ZONE_RADIUS, ZONE_FIGSIZE, out)
            produced.append(out)
        except Exception as exc:
            print(f"[zone-{i}] FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)

    # (c) printable card: densest cafe neighborhood, portrait
    if zones:
        count, lat, lon = zones[0]
        print(f"[card] densest cell ({count} shops) centroid=({lat:.5f}, {lon:.5f})")
        try:
            render((lat, lon), CARD_RADIUS, CARD_FIGSIZE, OUT_DIR / "card.png", circle=False)
            produced.append(OUT_DIR / "card.png")
        except Exception as exc:
            print(f"[card] FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)

    print("\n=== produced ===")
    for p in produced:
        size = p.stat().st_size
        print(f"{p}  {size / 1024:.0f} KiB")

    hero = OUT_DIR / "hero.png"
    if not hero.exists() or hero.stat().st_size < 100 * 1024:
        print("ERROR: hero.png missing or < 100 KiB", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
