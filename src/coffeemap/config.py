"""City + path configuration."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # src/coffeemap/config.py -> repo root
DATA = ROOT / "data"
ARCHIVE = DATA / "archive"
DB_PATH = DATA / "coffeemap.db"
CONFIG_PATH = ROOT / "config" / "city.toml"


@dataclass(frozen=True)
class City:
    name: str
    country: str
    locale: str
    timezone: str
    center_lat: float
    center_lon: float
    zoom: float
    bbox: tuple[float, float, float, float]  # south, west, north, east
    gmaps_queries: list[str]
    web_queries: list[str] = field(default_factory=list)
    web_extra_pages: list[str] = field(default_factory=list)


def load_city(path: Path | None = None) -> City:
    raw = tomllib.loads((path or CONFIG_PATH).read_text(encoding="utf-8"))
    return City(
        name=raw["name"],
        country=raw.get("country", ""),
        locale=raw.get("locale", "en-US"),
        timezone=raw.get("timezone", "UTC"),
        center_lat=raw["center_lat"],
        center_lon=raw["center_lon"],
        zoom=raw.get("zoom", 12.0),
        bbox=(raw["bbox_south"], raw["bbox_west"], raw["bbox_north"], raw["bbox_east"]),
        gmaps_queries=list(raw.get("gmaps_queries", [])),
        web_queries=list(raw.get("web_queries", [])),
        web_extra_pages=list(raw.get("web_extra_pages", [])),
    )
