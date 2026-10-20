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
    else:
        print(f"{args.cmd}: not implemented yet", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
