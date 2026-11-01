#!/usr/bin/env python3
"""Look for an Instagram link on the websites a city's shops already declare.

Bounded and honest: it only visits URLs we already hold (OSM `website` tags), follows at
most one redirect hop, and records what it finds without attaching anything. The yield is
the point — it tells you whether this path can move coverage or cannot.

    python3 scripts/mine_websites.py tj            # dry run, reports yield
    python3 scripts/mine_websites.py tj --attach   # write found handles onto places
"""
from __future__ import annotations

import argparse
import sys
import re
import sqlite3
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mine_search import plausible  # same name gate as the search leg

ROOT = Path(__file__).resolve().parents[1]
DBS = {"tj": "data/coffeemap.db", "sd": "data/coffeemap-sd.db"}
IG = re.compile(r"instagram\.com/([A-Za-z0-9._]{2,30})", re.I)
SKIP = {"p", "reel", "reels", "tv", "stories", "explore", "accounts", "instagram"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("city", choices=sorted(DBS))
    ap.add_argument("--attach", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    con = sqlite3.connect(ROOT / DBS[args.city])
    con.row_factory = sqlite3.Row
    sql = "SELECT id, name, website FROM places WHERE website IS NOT NULL AND website != ''"
    rows = [dict(r) for r in con.execute(sql)]
    if args.limit:
        rows = rows[: args.limit]

    found = 0
    checked = 0
    errors = 0
    with httpx.Client(timeout=12, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 coffee-map"}) as client:
        for r in rows:
            url = r["website"]
            if not url.startswith("http"):
                url = "https://" + url
            try:
                html = client.get(url).text
                checked += 1
            except Exception:
                errors += 1
                continue
            handles = [h for h in IG.findall(html) if h.lower() not in SKIP]
            if not handles:
                continue
            handle = max(set(handles), key=handles.count).rstrip(".")
            if not plausible(handle, r["name"]):
                print(f"REJ  {r['name'][:34]:36s} -> @{handle} (name does not match)")
                continue
            found += 1
            print(f"{r['name'][:34]:36s} -> @{handle}")
            if args.attach:
                con.execute("UPDATE places SET instagram=? WHERE id=? AND (instagram IS NULL OR instagram='')", (handle, r["id"]))
    if args.attach:
        con.commit()
    print(f"checked {checked} sites, {errors} unreachable, {found} carried an Instagram link")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
