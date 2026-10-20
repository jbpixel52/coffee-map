"""Bounded IG discovery spike (T4.4): can logged-out hashtag/location pages yield
candidate handles we don't already know? One page load per URL, archive-first.

Decision rule (from the plan): any URL whose classify is login_required/challenge
=> no-go, record and stop. A `public` render with extractable handles => green-light
an `ig-discover` tier as a follow-up phase.
"""
import gzip
import random
import re
import sys
import time
from pathlib import Path

from coffeemap.config import ARCHIVE, load_city
from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()  # must run before patchright is imported (it caches the env)

from coffeemap.sources.ig import classify_html  # noqa: E402
from patchright.sync_api import sync_playwright  # noqa: E402

URLS = [
    "https://www.instagram.com/explore/tags/cafetijuana/",
    "https://www.instagram.com/explore/tags/cafesdetijuana/",
    "https://www.instagram.com/explore/tags/tijuanacoffee/",
]

HANDLE_RE = re.compile(r'"username":"([A-Za-z0-9._]{2,30})"')


def handles_in(html: str) -> set[str]:
    out = {h for h in HANDLE_RE.findall(html)}
    out.discard("instagram")
    return out


city = load_city()
out_dir = Path(ARCHIVE) / "spike"
out_dir.mkdir(parents=True, exist_ok=True)
verdict: list[tuple[str, str, int]] = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    for url in URLS:
        ctx = browser.new_context(
            locale=city.locale,
            timezone_id=city.timezone,
            viewport={"width": 1366, "height": 1000},
        )
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_timeout(4000)
            html = page.content()
        except Exception as exc:  # noqa: BLE001 — a crash is a datum
            print(f"[{url}] error: {type(exc).__name__}")
            verdict.append((url, f"error:{type(exc).__name__}", 0))
            ctx.close()
            continue
        finally:
            try:
                ctx.close()
            except Exception:  # noqa: BLE001
                pass
        safe = re.sub(r"[^a-z0-9]+", "_", url.split("instagram.com/")[-1]).strip("_")
        path = out_dir / f"{safe}.html.gz"
        path.write_bytes(gzip.compress(html.encode("utf-8")))
        state = classify_html(html)
        hs = handles_in(html)
        print(f"[{url}] state={state} handles={len(hs)} bytes={len(html)} -> {path}")
        for h in sorted(hs)[:10]:
            print(f"    - {h}")
        verdict.append((url, state, len(hs)))
        time.sleep(random.randint(6000, 12000) / 1000)
    browser.close()

print("\nSPIKE VERDICT:")
for url, state, n in verdict:
    print(f"  {state:<16} handles={n:<3} {url}")

print("\nGo/no-go (plan rule): go if any URL is 'public' with handles > 0")
sys.exit(0)
