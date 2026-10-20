"""Capture one logged-out Instagram profile page into tests/fixtures/ig_profile.html.gz.

Usage: uv run python scripts/capture_ig_fixture.py <handle>
"""
import gzip
import re
import sys
from pathlib import Path

from coffeemap.config import load_city
from coffeemap.sources.gmaps import ensure_browsers_path

ensure_browsers_path()  # must run before patchright is imported (it caches the env)

from patchright.sync_api import sync_playwright  # noqa: E402

handle = sys.argv[1]
city = load_city()
out = Path("tests/fixtures/ig_profile.html.gz")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(
        locale=city.locale,
        timezone_id=city.timezone,
        viewport={"width": 1366, "height": 1000},
    )
    page = ctx.new_page()
    page.goto(f"https://www.instagram.com/{handle}/", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(3000)
    html = page.content()
    out.write_bytes(gzip.compress(html.encode("utf-8")))
    low = html.lower()
    m = re.search(r'<meta property="og:description" content="([^"]*)"', html)
    print(f"handle={handle} bytes={len(html)}")
    print(f"  xig_user_by_username x{html.count('xig_user_by_username')}, "
          f"follower_count x{html.count('follower_count')}, "
          f"data-sjs x{html.count('data-sjs')}")
    print(f"  password field: {'type=&quot;password&quot;' in low or 'type=\"password\"' in low}, "
          f"challenge: {'challenge_required' in low}")
    print(f"  og:description: {m.group(1)[:160] if m else None}")
    browser.close()
