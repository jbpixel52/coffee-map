"""Unit tests for the web tier: SERP/listicle extractors (pure, offline)."""
from __future__ import annotations

from coffeemap.sources import web


HOTELTA_CUBAYA_ENTRY = """
## 1.Café Aquamarino

Café junto al mar con vistas increíbles y ambiente relajado para todos.

*   Calificación: [4,4/5 (2352 Review by google)](https://www.google.com/maps/place/Caf%C3%A9+Aquamarino/data=!4m7!3m6!1s0x80d94ba87cac5919:0x42836d079f5257fb!8m2!3d32.523808!4d-117.123907!16s%2Fg%2F1ts1my1p!19sChIJGVmsfKhL2YAR-1dSnwdtg0I?authuser=0&hl=es&rclk=1)
*   Dirección: P.º Costero 1342, Playas de Tijuana, Costa, 22500 Tijuana, B.C., México
"""

TRIPADVISOR_LIST = (
    "[1\\. Cafe de la Flor - Plaza Río](/Restaurant_Review-g150776-d3364819-Reviews-"
    "Cafe_de_la_Flor_Plaza_Rio-Tijuana_Baja_California.html)   \n"
    "[2\\. Mision 19 - Zona Rio](/Restaurant_Review-g150776-d1234567-Reviews.html)\n"
)


def test_extract_gmaps_links_reads_name_coords_and_place_id():
    out = web.extract_gmaps_links(HOTELTA_CUBAYA_ENTRY)
    assert len(out) == 1
    item = out[0]
    assert item["name"] == "Café Aquamarino"
    assert item["lat"] == 32.523808
    assert item["lon"] == -117.123907
    assert item["source_id"] == "gmaps:ChIJGVmsfKhL2YAR-1dSnwdtg0I"


def test_extract_gmaps_links_dedupes_by_place_id():
    doubled = HOTELTA_CUBAYA_ENTRY + HOTELTA_CUBAYA_ENTRY
    assert len(web.extract_gmaps_links(doubled)) == 1


def test_extract_gmaps_links_needs_both_coords_and_id():
    md = "[x](https://www.google.com/maps/place/Solo+Coords/data=!4m2!3d32.5!4d-117.0)"
    assert web.extract_gmaps_links(md) == []


def test_extract_list_names_strips_escaped_numbers_and_descriptors():
    out = web.extract_list_names(TRIPADVISOR_LIST)
    assert [o["name"] for o in out] == ["Cafe de la Flor", "Mision 19"]
    assert out[0]["url"].startswith("/Restaurant_Review-g150776-d3364819")


def test_extract_ig_from_serp_parses_title_and_followers():
    item = {
        "url": "https://www.instagram.com/impuntual.socialcoffee/",
        "title": "Café de especialidad Tijuana (@impuntual.socialcoffee) - Instagram",
        "description": "6.9K+ followers · 2.7K+ following · 38 posts · @impuntual.socialcoffee: “COFFEE,”",
    }
    out = web.extract_ig_from_serp([item])
    assert len(out) == 1
    assert out[0]["handle"] == "impuntual.socialcoffee"
    assert out[0]["name"] == "Café de especialidad Tijuana"
    assert out[0]["followers_hint"] == 6900


def test_extract_ig_from_serp_falls_back_to_url_handle():
    item = {
        "url": "https://www.instagram.com/crucoffee/?hl=en",
        "title": "CRU Coffee",
        "description": "1,204 followers",
    }
    out = web.extract_ig_from_serp([item])
    assert out[0]["handle"] == "crucoffee"
    assert out[0]["name"] == ""
    assert out[0]["followers_hint"] == 1204


def test_parse_followers_hint_units():
    assert web.parse_followers_hint("13 mil seguidores") is None
    assert web.parse_followers_hint("2M followers") == 2_000_000
    assert web.parse_followers_hint("2352 Review by google") is None


def test_extract_ig_links_skips_reserved_paths_and_dedupes():
    md = (
        "see [post](https://www.instagram.com/p/C6o2H4uvc5U/) and "
        "[reel](https://www.instagram.com/reel/abc/) and "
        "[Junjo](https://www.instagram.com/junjomx/) then again "
        "(https://instagram.com/junjomx/)"
    )
    assert web.extract_ig_links(md) == ["junjomx"]


def test_candidate_pages_skips_socials_and_prefers_directories():
    items = [
        {"url": "https://www.instagram.com/x/", "title": "x"},
        {"url": "https://someblog.com/random-post", "title": "Random"},
        {"url": "https://www.tripadvisor.com.mx/Restaurants-g150776-c8.html", "title": "LOS 10 MEJORES cafeterías"},
        {"url": "https://m.yelp.com/search?find_loc=Tijuana", "title": "THE BEST 10 CAFETERIAS"},
    ]
    picked = web.candidate_pages(items, per_query=5)
    assert "https://www.instagram.com/x/" not in picked
    assert picked[0].startswith("https://www.tripadvisor")
    assert len(picked) == 3
