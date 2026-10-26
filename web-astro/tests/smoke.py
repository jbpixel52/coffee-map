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
    page.click("#tab-shops")
    page.wait_for_selector("#panel-shops", timeout=5000)
    page.fill("#panel-shops input[type=search]", "lumi")
    page.wait_for_timeout(600)
    feats = page.evaluate(
        "window.__map.getSource('shops').serialize().data.features",
        isolated_context=False,
    )
    shown = sum(1 for f in feats if f["properties"].get("dim") is not True)
    assert len(feats) == meta["shop_count"], f"features {len(feats)} != meta {meta['shop_count']}"
    assert shown < meta["shop_count"], "filter dimmed nothing"
    count = page.inner_text(".titlebar-sub b").strip().replace(",", "")
    assert count == str(shown), f"count {count!r} != {shown} shown"

    # a row opens the ficha, and the tag lands on the map
    page.click(".stack-row", timeout=5000)
    page.wait_for_selector(".slip h3", timeout=5000)
    assert page.evaluate("!!document.querySelector('.tag')", isolated_context=False), "map tag missing"
    assert page.evaluate("!!document.querySelector('#panel-shops')", isolated_context=False), (
        "picking a shop must not close the list"
    )

    # city filter (only when the shipped data holds more than one city)
    cities = meta.get("cities", [])
    if len(cities) > 1:
        second = cities[1]["name"]
        page.click(f"#panel-shops .panel-cities >> text='{second}'")
        page.wait_for_timeout(700)
        in_city = page.evaluate(
            "window.__map.getSource('shops').serialize().data.features"
            ".filter(f => f.properties.city === %r && f.properties.dim !== true).length" % second,
            isolated_context=False,
        )
        got = page.inner_text(".titlebar-sub b").strip().replace(",", "")
        assert got == str(in_city), f"city filter: count {got!r} != {in_city} {second} shops"
        assert in_city < meta["shop_count"], "city filter did not narrow the census"
        page.click("#panel-shops .panel-cities >> text='Todas'")
        page.wait_for_timeout(500)

    # settings tab owns night + heat
    page.click("#tab-settings")
    page.wait_for_selector("#panel-settings", timeout=5000)
    page.click("#set-night")
    page.wait_for_timeout(400)
    assert page.evaluate("document.documentElement.classList.contains('night')", isolated_context=False), (
        "night class not applied"
    )
    bg = page.evaluate("window.__map.getPaintProperty('background','background-color')", isolated_context=False)
    assert bg == "#191c27", f"night sheet not applied: {bg}"

    page.click("#set-heat")
    page.wait_for_timeout(600)
    heat_vis = page.evaluate(
        "window.__map.getLayoutProperty('shops-heat','visibility')", isolated_context=False
    )
    assert heat_vis == "visible", f"heatmap did not toggle: {heat_vis}"

    map_errors = page.evaluate("window.__mapErrors || []", isolated_context=False)
    assert not map_errors, f"map errors: {map_errors}"
    assert not errors, f"page errors: {errors}"
    print(
        f"OK: {n} shops, {dots} dots rendered, {tiles['ok']} vector tiles, "
        f"tabs + panels, dim-filter + count, ficha + tag, night sheet, heat toggle + {heat_op} opacity, 0 errors"
    )
    browser.close()
