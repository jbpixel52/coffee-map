"""coffeemap CLI: fetch -> parse -> merge -> export."""
from __future__ import annotations

import argparse
import random
import sys
import time

from .config import load_city
from .store import archive_read, archive_write, connect, latest_fetch, record_fetch, upsert_place


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="coffeemap")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("osm-fetch", help="fetch cafes from Overpass and archive the bytes")
    sub.add_parser("osm-parse", help="parse the latest archived Overpass payload into places")
    p = sub.add_parser("gmaps-fetch", help="scrape Google Maps search results (Phase 3)")
    p.add_argument("--max-scrolls", type=int, default=6)
    sub.add_parser("gmaps-parse", help="parse archived Google Maps HTML into places")
    p = sub.add_parser("ig-recon", help="logged-out Instagram profile recon (Phase 4)")
    p.add_argument("--limit", type=int, default=60)
    sub.add_parser("merge", help="rebuild canonical shops from places")
    sub.add_parser("export", help="write web/public/data (geojson + meta)")
    sub.add_parser("status", help="print row counts")

    args = ap.parse_args(argv)
    city = load_city()
    con = connect()

    if args.cmd == "osm-fetch":
        from .sources import osm

        raw = osm.fetch(city)
        ref = archive_write("osm", "cafe-bbox", raw, "json")
        record_fetch(con, "osm", "cafe-bbox", ref)
        print(f"osm-fetch: archived {len(raw)} bytes -> {ref}")
    elif args.cmd == "osm-parse":
        from .sources import osm

        ref = latest_fetch(con, "osm")
        if not ref:
            print("osm-parse: nothing fetched yet — run `coffeemap osm-fetch`", file=sys.stderr)
            return 1
        items = osm.parse_elements(archive_read(ref))
        for it in items:
            upsert_place(con, source="osm", archive_ref=ref, **it)
        con.commit()
        named = sum(1 for i in items if i["name"])
        print(f"osm-parse: {len(items)} places ({named} named) from {ref}")
    elif args.cmd == "status":
        for table in ("places", "shops", "ig_profiles", "fetches"):
            n = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"{table:12s} {n}")
        for row in con.execute("SELECT source, COUNT(*) n FROM places GROUP BY source"):
            print(f"  places[{row['source']}] {row['n']}")
    elif args.cmd == "gmaps-fetch":
        # ensure_browsers_path() MUST run before patchright is imported: it reads
        # PLAYWRIGHT_BROWSERS_PATH once at import time and caches it.
        from .sources.gmaps import ensure_browsers_path, fetch_query

        ensure_browsers_path()
        from patchright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(
                locale=city.locale,
                timezone_id=city.timezone,
                viewport={"width": 1366, "height": 1000},
            )
            page = ctx.new_page()
            for i, q in enumerate(city.gmaps_queries):
                html = fetch_query(page, q, city, args.max_scrolls)
                ref = archive_write("gmaps", q, html.encode("utf-8"), "html")
                record_fetch(con, "gmaps", q, ref)
                print(f"gmaps-fetch [{q}] {html.count('/maps/place/')} card links -> {ref}")
                if i < len(city.gmaps_queries) - 1:
                    time.sleep(random.randint(8, 15))  # be gentle with anonymous Maps
            browser.close()
    elif args.cmd == "gmaps-parse":
        from .sources.gmaps import parse_html

        refs = [
            r["archive_ref"]
            for r in con.execute("SELECT archive_ref FROM fetches WHERE source='gmaps' ORDER BY id")
        ]
        for ref in refs:
            for it in parse_html(archive_read(ref).decode("utf-8")):
                upsert_place(con, source="gmaps", archive_ref=ref, **it)
        con.commit()
        n = con.execute("SELECT COUNT(*) FROM places WHERE source='gmaps'").fetchone()[0]
        print(f"gmaps-parse: {n} places from {len(refs)} archived pages")
    elif args.cmd == "merge":
        from .merge import rebuild_shops

        shops, merged = rebuild_shops(con)
        print(f"merge: {shops} shops ({merged} duplicate place rows merged)")
    elif args.cmd == "export":
        import json as _json

        from .export import export

        print(_json.dumps(export(con, city), ensure_ascii=False, indent=2))
    else:
        print(f"{args.cmd}: not implemented yet", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
