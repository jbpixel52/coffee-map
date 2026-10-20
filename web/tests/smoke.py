"""Smoke test for the built map. Run from the repo root:

    PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers uv run python web/tests/smoke.py \
        http://localhost:5199/coffee-map/
"""
import json
import sys

from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()  # must run before patchright is imported (it caches the env)

from patchright.sync_api import sync_playwright  # noqa: E402

url = sys.argv[1]
meta = json.loads(open("web/public/data/meta.json", encoding="utf-8").read())

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
    tiles = {"ok": 0, "err": 0}

    def on_resp(r):
        if "tiles.openfreemap.org" in r.url:
            tiles["ok" if r.status == 200 else "err"] += 1

    page.on("response", on_resp)
    page.goto(url, wait_until="load", timeout=60_000)
    page.wait_for_function("window.__map && window.__map.isStyleLoaded()", timeout=60_000)
    page.wait_for_timeout(1500)

    # the active style is OUR watercolor theme, sprite included
    assert page.evaluate(
        "!!(window.__map.getLayer('water-bleed') && window.__map.getLayer('background'))",
        isolated_context=False,
    ), "watercolor layers missing — is the custom style active?"
    assert page.evaluate("window.__map.hasImage('paper')", isolated_context=False), (
        "sprite image 'paper' missing — styles/sprite.json or sprite.png not served?"
    )

    # painted-at-rest post-process: SVG displacement filter on the canvas +
    # screen-space paper overlay (both degrade to a clean map if unsupported)
    page.wait_for_function(
        "window.__map.loaded() && !document.getElementById('map').classList.contains('moving')",
        timeout=90_000,
    )
    paint = page.evaluate(
        """() => ({
             filter: getComputedStyle(document.querySelector('.maplibregl-canvas')).filter,
             paper: !!document.getElementById('paper'),
           })"""
    )
    assert "wc-paint" in paint["filter"], f"canvas displacement filter not applied: {paint['filter']!r}"
    assert paint["paper"], "screen-space paper overlay missing"

    # NOTE: patchright's page.evaluate runs in an ISOLATED world by default —
    # main-world globals (window.__shops etc.) need isolated_context=False.
    n = page.evaluate("window.__shops.length", isolated_context=False)
    assert n == meta["shop_count"], f"markers {n} != meta {meta['shop_count']}"
    label = page.text_content("#count")
    assert f"de {n} cafés" in label, f"unexpected count label: {label!r}"

    # "Con Instagram" narrows the layer to the IG subset
    page.click("#only-ig")
    page.wait_for_timeout(300)
    label_ig = page.text_content("#count")
    assert label_ig.startswith(f"{meta['with_instagram']} de"), f"IG filter label: {label_ig!r}"
    page.click("#only-ig")
    page.wait_for_timeout(300)

    # popup: prefer a shop WITH instagram followers (proves the recon join) —
    # recentre on it, isolate it via the search box, then click its projected
    # position plus the container offset (map.project returns map-container
    # coords, not viewport coords).
    name, x, y, igf = page.evaluate(
        """() => {
             let best = null;
             for (const f of window.__shops) {
               if (f.properties.ig_followers && f.properties.ig_followers > 0) { best = f; break; }
             }
             if (!best) return [null, 0, 0, 0];
             const [lon, lat] = best.geometry.coordinates;
             window.__map.jumpTo({center: [lon, lat]});
             const pt = window.__map.project([lon, lat]);
             const r = document.getElementById("map").getBoundingClientRect();
             return [best.properties.name, pt.x + r.left, pt.y + r.top, best.properties.ig_followers];
           }""",
        isolated_context=False,
    )
    assert name, "no shop with ig_followers in the dataset — recon+export not joined?"
    page.wait_for_timeout(400)
    page.fill("#q", name)
    page.wait_for_timeout(400)
    page.mouse.click(x, y)
    page.wait_for_selector(".maplibregl-popup-content", timeout=10_000)
    text = (page.text_content(".maplibregl-popup-content") or "").strip()
    assert "Google Maps" in text, text
    assert "seguidores" in text and str(igf) in text, f"popup missing followers ({igf}): {text}"
    assert tiles["ok"] >= 1 and tiles["err"] == 0, f"vector tiles: {tiles}"
    print(
        f"OK: {n} markers, {meta['with_instagram']} with IG, "
        f"{tiles['ok']} vector tiles; "
        f"popup: {text.splitlines()[0][:60]} (seguidores {igf})"
    )
    browser.close()
