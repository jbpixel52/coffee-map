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
    assert page.evaluate("!!window.__map.getLayer('background')", isolated_context=False), "background layer missing"
    # the plan draws roads as hairlines (no casings) and no texture sprites
    assert page.evaluate("!!window.__map.getLayer('road-motorway')", isolated_context=False), "road layer missing"
    assert page.evaluate("!window.__map.getStyle().sprite", isolated_context=False), "unexpected sprite"
    assert tiles["ok"] >= 1 and tiles["err"] == 0, f"vector tiles: {tiles}"

    # The dots layer is the product. MapLibre drops a layer whose paint fails
    # validation without throwing, so assert it exists AND renders features.
    dots = page.evaluate(
        "window.__map.getLayer('shops-dots') ? "
        "window.__map.queryRenderedFeatures({layers:['shops-dots']}).length : -1",
        isolated_context=False,
    )
    assert dots > 0, f"shops dots layer missing or empty: {dots}"

    # heat must stay translucent
    heat_op = page.evaluate(
        "window.__map.getPaintProperty('shops-heat','heatmap-opacity')",
        isolated_context=False,
    )
    assert isinstance(heat_op, float) and heat_op <= 0.4, f"heatmap opacity too strong: {heat_op}"

    # filters dim instead of hiding: searching keeps every feature on the map,
    # marks the non-matches as dim, and the count follows
    page.fill("input[type=search]", "lumi")
    page.wait_for_timeout(600)
    feats = page.evaluate(
        "window.__map.getSource('shops').serialize().data.features",
        isolated_context=False,
    )
    shown = sum(1 for f in feats if f["properties"].get("dim") is not True)
    assert len(feats) == meta["shop_count"], f"features {len(feats)} != meta {meta['shop_count']}"
    assert shown < meta["shop_count"], "filter dimmed nothing"
    count = page.inner_text(".count b").strip()
    assert count == str(shown), f"count {count!r} != {shown} shown"

    # the rail opens a ficha with the real handle, and the tag lands on the map
    page.click(".rows .row", timeout=5000)
    page.wait_for_selector(".slip h3", timeout=5000)
    assert page.evaluate("!!document.querySelector('.tag')", isolated_context=False), "map tag missing"

    # noche flips the sheet
    page.click("button[aria-label='Modo noche']")
    page.wait_for_timeout(400)
    assert page.evaluate("document.documentElement.classList.contains('night')", isolated_context=False), (
        "night class not applied"
    )
    bg = page.evaluate("window.__map.getPaintProperty('background','background-color')", isolated_context=False)
    assert bg == "#191c27", f"night sheet not applied: {bg}"

    map_errors = page.evaluate("window.__mapErrors || []", isolated_context=False)
    assert not map_errors, f"map errors: {map_errors}"
    assert not errors, f"page errors: {errors}"
    print(
        f"OK: {n} shops, {dots} dots rendered, {tiles['ok']} vector tiles, "
        f"dim-filter + count, ficha + tag, night sheet, heat {heat_op}, 0 errors"
    )
    browser.close()
