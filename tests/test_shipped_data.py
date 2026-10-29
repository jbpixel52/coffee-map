"""Invariants of the file that ships, checked on every run.

`web-astro/public/data/shops.geojson` is the product: everything else is a step that
produces it. These assertions are cheap, need no database, and fail the build before a
broken census reaches the map — the kind of mistake a 400-shop import makes once.
"""
from __future__ import annotations

import json
import re
import tomllib
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
GEOJSON = ROOT / "web-astro" / "public" / "data" / "shops.geojson"
META = ROOT / "web-astro" / "public" / "data" / "meta.json"
HANDLE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


@pytest.fixture(scope="module")
def features() -> list[dict]:
    return json.loads(GEOJSON.read_text(encoding="utf-8"))["features"]


@pytest.fixture(scope="module")
def city_boxes() -> dict[str, tuple[float, float, float, float]]:
    boxes: dict[str, tuple[float, float, float, float]] = {}
    for cfg in (ROOT / "config").glob("city*.toml"):
        raw = tomllib.loads(cfg.read_text(encoding="utf-8"))
        if "bbox_south" not in raw or not raw.get("name"):
            continue
        box = (raw["bbox_south"], raw["bbox_west"], raw["bbox_north"], raw["bbox_east"])
        name = raw["name"]
        if name in boxes:  # tiles: the city's box is the union of its tiles
            s, w, n, e = boxes[name]
            box = (min(s, box[0]), min(w, box[1]), max(n, box[2]), max(e, box[3]))
        boxes[name] = box
    return boxes


def test_meta_matches_the_geojson(features):
    meta = json.loads(META.read_text(encoding="utf-8"))
    assert meta["shop_count"] == len(features)
    assert meta["with_instagram"] == sum(1 for f in features if f["properties"].get("instagram"))
    counted = Counter(f["properties"]["city"] for f in features)
    for city in meta["cities"]:
        assert city["shop_count"] == counted[city["name"]], city["name"]


def test_every_shop_has_a_name_and_plausible_coordinates(features):
    for f in features:
        props, (lon, lat) = f["properties"], f["geometry"]["coordinates"]
        assert (props.get("name") or "").strip(), f"unnamed shop at {lon},{lat}"
        assert -180 <= lon <= 180 and -90 <= lat <= 90, props["name"]


def test_no_shop_sits_outside_its_own_city(features, city_boxes):
    outside = []
    for f in features:
        props = f["properties"]
        box = city_boxes.get(props["city"])
        if not box:
            continue
        lon, lat = f["geometry"]["coordinates"]
        if not (box[0] <= lat <= box[2] and box[1] <= lon <= box[3]):
            outside.append((props["city"], props["name"]))
    assert not outside, f"{len(outside)} shops outside their city box: {outside[:5]}"


def test_no_duplicate_shop_at_the_same_spot(features):
    seen = Counter(
        (f["properties"]["city"], (f["properties"]["name"] or "").lower(),
         round(f["geometry"]["coordinates"][0], 4), round(f["geometry"]["coordinates"][1], 4))
        for f in features
    )
    dupes = [key for key, n in seen.items() if n > 1]
    assert not dupes, f"{len(dupes)} duplicate shops: {dupes[:3]}"


def test_instagram_handles_look_like_handles(features):
    bad = [f["properties"]["instagram"] for f in features
           if f["properties"].get("instagram") and not HANDLE.match(f["properties"]["instagram"])]
    assert not bad, f"{len(bad)} malformed handles: {bad[:5]}"


def test_no_shop_ships_a_zero_audience(features):
    """0 followers is a failed read; export ships null for it."""
    zero = [f["properties"]["name"] for f in features if f["properties"].get("ig_followers") == 0]
    assert not zero, f"{len(zero)} shops claim 0 followers: {zero[:5]}"
