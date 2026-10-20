import gzip
from pathlib import Path

from coffeemap.sources.gmaps import parse_html, search_url

FIXTURE = Path(__file__).parent / "fixtures" / "gmaps_search.html.gz"

# Locked against the captured page (2026-10-19): "coffee shops Tijuana", one load.
FIRST = {"name": "Saint Cocó Coffee Bar 3ra Etapa Rio DT", "lat": 32.477847, "lon": -116.9276611}


def test_search_url():
    from coffeemap.config import load_city

    url = search_url("coffee shops Tijuana", load_city())
    assert url.startswith(
        "https://www.google.com/maps/search/coffee+shops+Tijuana/@32.5149,-117.0382"
    )


def test_parses_cards_from_real_html():
    html = gzip.decompress(FIXTURE.read_bytes()).decode("utf-8")
    places = parse_html(html)
    assert len(places) == 8  # one page load, eight cards (measured)
    p = next((x for x in places if x["name"] == FIRST["name"]), None)
    assert p is not None, [x["name"] for x in places]
    assert p["lat"] == FIRST["lat"] and p["lon"] == FIRST["lon"]
    assert p["source_id"].startswith("gmaps:ChIJ")


def test_ids_unique_and_coords_in_tijuana():
    html = gzip.decompress(FIXTURE.read_bytes()).decode("utf-8")
    places = parse_html(html)
    assert len({p["source_id"] for p in places}) == len(places)
    assert all(32.3 < p["lat"] < 32.7 and -117.2 < p["lon"] < -116.8 for p in places)


def test_ignores_non_card_links():
    assert parse_html("<html><body>no maps links</body></html>") == []
