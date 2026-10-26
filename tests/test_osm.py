import json
from pathlib import Path

from coffeemap.config import load_city
from coffeemap.sources.osm import build_query, parse_elements

FIXTURE = Path(__file__).parent / "fixtures" / "osm_tijuana.json"
# Measured 2026-10-19 against the fixture above.
TOTAL, NAMED, WAYS = 242, 229, 38

def test_query_shape():
    q = build_query(load_city())
    assert '"amenity"="cafe"' in q and "out center tags" in q and "32.37" in q

def test_parses_real_overpass_payload():
    items = parse_elements(FIXTURE.read_bytes())
    assert len(items) == TOTAL
    assert len([i for i in items if i["name"]]) == NAMED
    assert all(i["source_id"].startswith("osm:") for i in items)

def test_way_centers_and_instagram_normalisation():
    items = parse_elements(FIXTURE.read_bytes())
    ways = [i for i in items if i["source_id"].startswith("osm:way/")]
    assert len(ways) == WAYS
    assert all(-118 < i["lon"] < -116 and 32 < i["lat"] < 33 for i in ways)
    ig = [i["instagram"] for i in items if i["instagram"]]
    # measured: 8 contact:instagram tags + 8 more cafes whose website is an IG link
    assert len(ig) == 16
    assert all(not h.startswith("@") and "instagram.com" not in h for h in ig)

def test_norm_instagram_cases():
    from coffeemap.sources.osm import norm_instagram

    assert norm_instagram("https://www.instagram.com/patio17cafe/") == "patio17cafe"
    assert norm_instagram("@Patio17Cafe") == "Patio17Cafe"
    assert norm_instagram("instagram.com/x?hl=es") == "x"
    assert norm_instagram("") == ""

def test_format_address():
    from coffeemap.sources.osm import format_address

    full = {"addr:street": "Av. Revolución", "addr:housenumber": "123", "addr:city": "Tijuana", "addr:postcode": "22000"}
    assert format_address(full) == "123 Av. Revolución, Tijuana, 22000"  # number first, one convention for both countries
    # no addr:city: fall back to the configured city rather than a bare postcode
    no_city = {"addr:street": "Brazos Street", "addr:housenumber": "604", "addr:postcode": "78701"}
    assert format_address(no_city, "Austin") == "604 Brazos Street, Austin, 78701"
    assert format_address({}) is None
    assert format_address({"addr:postcode": "22000"}, "Tijuana") is None  # a postcode is not a street address
