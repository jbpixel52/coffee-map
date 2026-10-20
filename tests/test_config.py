from pathlib import Path

from coffeemap.config import load_city


def test_loads_default_city(tmp_path: Path):
    city = load_city()
    assert city.name == "Tijuana"
    assert city.bbox == (32.37, -117.20, 32.70, -116.87)
    assert city.locale == "es-MX"
    # multi-query harvest (zone variants) + web-tier SERP queries
    assert len(city.gmaps_queries) >= 15
    assert any("Zona Rio" in q for q in city.gmaps_queries)
    assert len(city.web_queries) >= 10


def test_loads_custom_path(tmp_path: Path):
    p = tmp_path / "city.toml"
    p.write_text(
        'name = "Rosarito"\ncountry = "MX"\ncenter_lat = 32.3\ncenter_lon = -117.0\n'
        "bbox_south = 32.2\nbbox_west = -117.1\nbbox_north = 32.4\nbbox_east = -116.9\n",
        encoding="utf-8",
    )
    city = load_city(p)
    assert city.name == "Rosarito"
    assert city.gmaps_queries == []
    assert city.web_queries == []
