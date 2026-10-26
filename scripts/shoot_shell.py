"""Capture the new shell: title+tabs, shops panel, settings, ficha, mobile, night."""
from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()
from pathlib import Path
from patchright.sync_api import sync_playwright

url = "http://localhost:4324/coffee-map/"
out = Path(".impeccable/review")
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])

    def shot(name, w, h, steps=None, wait=2400):
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, service_workers="block")
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(url, wait_until="load", timeout=90_000)
        page.wait_for_function("window.__map && window.__map.isStyleLoaded()", timeout=90_000)
        page.wait_for_timeout(wait)
        if steps:
            steps(page)
        page.screenshot(path=str(out / f"{name}.png"))
        print("ok", name, errs[:2])
        ctx.close()

    shot("shell", 1440, 900)
    shot("shell-list", 1440, 900, lambda pg: (pg.click("#tab-shops"), pg.wait_for_timeout(900)))
    shot("shell-settings", 1440, 900, lambda pg: (pg.click("#tab-settings"), pg.wait_for_timeout(900)))
    shot(
        "shell-ficha",
        1440,
        900,
        lambda pg: (
            pg.click("#tab-shops"),
            pg.fill("#panel-shops input[type=search]", "lumi"),
            pg.wait_for_timeout(600),
            pg.click(".stack-row"),
            pg.wait_for_timeout(1800),
        ),
    )
    shot("shell-mobile", 390, 844)
    shot("shell-night", 1440, 900, lambda pg: (pg.click("#tab-settings"), pg.click("#set-night"), pg.wait_for_timeout(900)))
    b.close()
