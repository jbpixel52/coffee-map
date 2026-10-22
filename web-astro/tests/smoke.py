"""Minimal smoke test for the Astro build (preview server)."""
import json
import sys

from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()
from patchright.sync_api import sync_playwright  # noqa: E402

url = sys.argv[1]
meta = json.loads(open("web-astro/public/data/meta.json", encoding="utf-8").read())

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
    tiles = {"ok": 0, "err": 0}
    errors = []

    def on_resp(r):
        if "tiles.openfreemap.org" in r.url:
            tiles["ok" if r.status == 200 else "err"] += 1

    def on_err(e):
        errors.append(e)

    page.on("response", on_resp)
    page.on("pageerror", on_err)
    page.goto(url, wait_until="load", timeout=60_000)
    page.wait_for_function("window.__map && window.__map.isStyleLoaded()", timeout=60_000)
    page.wait_for_timeout(1500)

    n = page.evaluate("window.__shops.length", isolated_context=False)
    assert n == meta["shop_count"], f"markers {n} != meta {meta['shop_count']}"
    assert page.evaluate("window.__map.hasImage('paper')", isolated_context=False), "sprite 'paper' missing"
    assert page.evaluate("!!window.__map.getLayer('background')", isolated_context=False), "background layer missing"
    assert tiles["ok"] >= 1 and tiles["err"] == 0, f"vector tiles: {tiles}"
    assert not errors, f"page errors: {errors}"
    print(f"OK: {n} markers, {tiles['ok']} vector tiles, sprite+style present, 0 page errors")
    browser.close()
