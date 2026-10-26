"""Capture the states the redesign must hold: desktop, mobile, noche, calor, ficha."""
from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()
from pathlib import Path
from patchright.sync_api import sync_playwright

url = "http://localhost:4322/coffee-map/"
out = Path(".impeccable/review")
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])

    def shot(name, w, h, steps=None):
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, service_workers="block")
        page = ctx.new_page()
        page.goto(url, wait_until="load", timeout=90_000)
        page.wait_for_function("window.__map && window.__map.isStyleLoaded()", timeout=90_000)
        page.wait_for_timeout(2500)
        if steps:
            steps(page)
        page.screenshot(path=str(out / f"{name}.png"))
        print("ok", name)
        ctx.close()

    shot("desktop", 1440, 900)
    shot("mobile", 390, 844)
    shot("night", 1440, 900, lambda pg: (pg.click("button[aria-label='Modo noche']"), pg.wait_for_timeout(900)))
    shot("calor", 1440, 900, lambda pg: (pg.click("text=Calor"), pg.wait_for_timeout(1200)))
    shot(
        "ficha",
        1440,
        900,
        lambda pg: (
            pg.fill("input[type=search]", "lumi"),
            pg.wait_for_timeout(500),
            pg.click(".rows .row"),
            pg.wait_for_timeout(1600),
        ),
    )
    b.close()
