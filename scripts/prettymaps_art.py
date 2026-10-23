#!/usr/bin/env python
"""Generate static prettymaps (OSM) art for the coffee-map site.

Outputs (under web-astro/public/art/):
  - hero.png     : central Tijuana, 1500 m radius, 1650 px square
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
    """Render one prettymaps figure; retry once with a smaller radius on failure.

    Writes a sibling `<name>.json` with the georeferencing the web map needs
    (center, radius, pixel size) so the poster can be draped as a raster layer.
    """
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
            write_meta(out_path, center, r, circle)
            soften(out_path)
            return out_path
        except Exception as exc:  # Overpass/osmnx/network failures land here
            if attempt == 2:
                raise
            print(f"    attempt 1 failed ({type(exc).__name__}: {exc}); retrying smaller")
    return out_path


def write_meta(out_path, center, radius, circle):
    """Persist georeferencing next to the PNG: center, radius, actual pixel size."""
    from PIL import Image  # pillow ships with matplotlib

    meta = {
        "image": out_path.name,
        "center": [center[0], center[1]],
        "radius_m": radius,
        "px": list(Image.open(out_path).size),
        "circle": circle,
        "source": "prettymaps + OpenStreetMap contributors (ODbL)",
        "generated_by": "scripts/prettymaps_art.py",
    }
    out_path.with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n")


def soften(path, inner=0.62, outer=0.98):
    """Fade the poster's square edges into transparency.

    The raw figure is a square with a thin black frame and a credit box in the
    corner; draped over the map it reads as a pasted card. A radial alpha ramp
    turns it into a soft disc that blends into the cream map paper (the frame
    and credit box sit outside `outer` and disappear with it).
    """
    from PIL import Image, ImageDraw  # pillow ships with matplotlib

    im = Image.open(path).convert("RGBA")
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    r_in, r_out = inner * w / 2, outer * w / 2
    steps = 96
    for i in range(steps):
        t = i / (steps - 1)
        r = r_out - t * (r_out - r_in)
        alpha = int(255 * t**1.6)  # smallest (innermost) ring is opaque
        draw.ellipse(
            [w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r],
            fill=alpha,
        )
    im.putalpha(mask)
    im.save(path)
    print(f"    softened -> {path.name} (alpha {inner:.2f}..{outer:.2f} of width)")


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
