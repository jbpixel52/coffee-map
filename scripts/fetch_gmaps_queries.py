#!/usr/bin/env python3
"""Fetch a handful of extra Google Maps queries into a city's archive.

`coffeemap gmaps-fetch` walks the whole `gmaps_queries` list, which is the right thing
for a full refresh and the wrong thing for adding three queries to a city that already
has 750 places (each query is a browser session with 6 scrolls).

    python3 scripts/fetch_gmaps_queries.py tj "matcha Tijuana" "matcha cafe Tijuana"
    python3 scripts/fetch_gmaps_queries.py sd "matcha San Diego"

The archive rows it writes are picked up by `coffeemap gmaps-parse`, which re-parses
every archived payload — so parse + merge + export afterwards is all that's needed.
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from coffeemap.config import load_city  # noqa: E402
from coffeemap.store import archive_write, connect, record_fetch  # noqa: E402

# config, database and archive travel together: fetching San Diego's queries into
# Tijuana's database is how a city silently grows 100 shops that are 30 km away.
CITIES = {
    "tj": ("config/city.toml", "data/coffeemap.db", "data/archive"),
    "sd": ("config/city.san-diego.toml", "data/coffeemap-sd.db", "data/archive-sd"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("city", choices=sorted(CITIES))
    ap.add_argument("queries", nargs="+")
    ap.add_argument("--max-scrolls", type=int, default=6)
    args = ap.parse_args()

    # ensure_browsers_path() MUST run before patchright is imported: it reads
    # PLAYWRIGHT_BROWSERS_PATH once at import time and caches it.
    from coffeemap.sources.gmaps import ensure_browsers_path, fetch_query

    ensure_browsers_path()
    from patchright.sync_api import sync_playwright

    cfg, db, archive = CITIES[args.city]
    os.environ["COFFEEMAP_CITY"] = cfg
    os.environ["COFFEEMAP_DB"] = db
    os.environ["COFFEEMAP_ARCHIVE"] = archive
    city = load_city(Path(cfg))
    con = connect()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            locale=city.locale,
            timezone_id=city.timezone,
            viewport={"width": 1366, "height": 1000},
        )
        page = ctx.new_page()
        for i, q in enumerate(args.queries):
            html = fetch_query(page, q, city, args.max_scrolls)
            ref = archive_write("gmaps", q, html.encode("utf-8"), "html")
            record_fetch(con, "gmaps", q, ref)
            print(f"[{q}] {html.count('/maps/place/')} card links -> {ref}")
            if i < len(args.queries) - 1:
                time.sleep(random.randint(8, 15))  # be gentle with anonymous Maps
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
