"""coffeemap CLI: fetch -> parse -> merge -> export."""
from __future__ import annotations

import argparse
import random
import sys
import time

from .config import load_city
from .store import (
    archive_read,
    archive_write,
    connect,
    latest_fetch,
    now_utc,
    record_fetch,
    upsert_place,
)


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
    elif args.cmd == "ig-recon":
        # ensure_browsers_path() MUST run before patchright is imported: it reads
        # PLAYWRIGHT_BROWSERS_PATH once at import time and caches it.
        from .sources.gmaps import ensure_browsers_path
        from .sources.ig import classify_html, fetch_profile_html, parse_profile_html

        ensure_browsers_path()
        from patchright.sync_api import sync_playwright

        handles = [
            r["instagram"]
            for r in con.execute(
                """SELECT DISTINCT instagram FROM places
                   WHERE instagram IS NOT NULL AND instagram <> '' LIMIT ?""",
                (args.limit,),
            )
        ]
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            summary: dict[str, int] = {}
            for i, handle in enumerate(handles):
                # One fresh context per handle: Instagram pages are heavy and a
                # renderer crash must cost one handle, not the whole batch.
                ctx = browser.new_context(
                    locale=city.locale,
                    timezone_id=city.timezone,
                    viewport={"width": 1366, "height": 1000},
                )
                page = ctx.new_page()
                html = None
                try:
                    html = fetch_profile_html(page, handle)
                except Exception as exc:  # noqa: BLE001 — a crash is a datum, not a stop
                    summary["error"] = summary.get("error", 0) + 1
                    print(f"ig-recon [{i + 1}/{len(handles)}] {handle}: error ({type(exc).__name__})")
                finally:
                    try:
                        ctx.close()
                    except Exception:  # noqa: BLE001 — already closing; don't mask the run
                        pass
                if html is None:
                    time.sleep(random.randint(6000, 12000) / 1000)
                    continue
                ref = archive_write("ig", handle, html.encode("utf-8"), "html")
                state = classify_html(html)
                summary[state] = summary.get(state, 0) + 1
                prof = parse_profile_html(html) if state == "public" else None
                con.execute(
                    """INSERT INTO ig_profiles (handle, followers, posts, last_post_at,
                                                capture_state, fetched_at, archive_ref)
                       VALUES (?, ?, ?, NULL, ?, ?, ?)
                       ON CONFLICT (handle) DO UPDATE SET
                         followers=excluded.followers, posts=excluded.posts,
                         capture_state=excluded.capture_state,
                         fetched_at=excluded.fetched_at, archive_ref=excluded.archive_ref""",
                    (
                        handle,
                        prof["followers"] if prof else None,
                        prof["posts"] if prof else None,
                        state,
                        now_utc(),
                        ref,
                    ),
                )
                con.commit()
                print(
                    f"ig-recon [{i + 1}/{len(handles)}] {handle}: {state} "
                    f"followers={prof['followers'] if prof else '-'} "
                    f"codes={len(prof['post_codes']) if prof else 0}"
                )
                if state == "challenge":  # terminal — never retry through a challenge
                    print("ig-recon: challenge received — stopping cold, do not retry")
                    break
                if state == "rate_limited":  # a throttle is not a dead surface
                    print("ig-recon: rate limited — backing off 15 min, one bounded retry")
                    time.sleep(900)
                else:
                    time.sleep(random.randint(6000, 12000) / 1000)
            browser.close()
        print("ig-recon summary:", summary)
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
