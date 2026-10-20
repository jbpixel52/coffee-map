"""Capture one Google Maps search page into tests/fixtures/gmaps_search.html.gz."""
import gzip
from pathlib import Path

from coffeemap.config import load_city
from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()  # must run before patchright is imported (it caches the env)

from coffeemap.sources.gmaps import fetch_query  # noqa: E402
from patchright.sync_api import sync_playwright  # noqa: E402

city = load_city()
out = Path("tests/fixtures/gmaps_search.html.gz")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(
        locale=city.locale,
        timezone_id=city.timezone,
        viewport={"width": 1366, "height": 1000},
    )
    page = ctx.new_page()
    html = fetch_query(page, "coffee shops Tijuana", city, max_scrolls=0)  # one clean load
    out.write_bytes(gzip.compress(html.encode("utf-8")))
    print("cards:", html.count("/maps/place/"), "bytes:", len(html))
    browser.close()
