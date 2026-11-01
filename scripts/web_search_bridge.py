#!/usr/bin/env python3
"""Feed the web-candidate tier from Hermes' own search when fastCRW is degraded.

fastCRW answers `503 search_degraded` — its service is healthy, its upstream search is not —
which stalls the whole discovery tier even though `web_search` in this kernel works. This
writes SERPs into the same archive shape `coffeemap web-search` produces, so `web-candidates`
and everything downstream is untouched.

Runs inside the Hermes kernel only:

    import sys, runpy
    sys.argv = ["web_search_bridge.py", "--limit", "8"]
    runpy.run_path("scripts/web_search_bridge.py", run_name="__main__")
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=8)
    ap.add_argument("--budget", type=int, default=35, help="queries this call may run")
    ap.add_argument("--all", action="store_true", help="re-run queries already archived today")
    args = ap.parse_args()

    from hermes_tools import web_search

    from coffeemap import store
    from coffeemap.config import load_city

    city = load_city()
    con = store.connect()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    done = {
        r["key"]
        for r in con.execute("SELECT key, archive_ref FROM fetches WHERE source='websearch'")
        if str(r["archive_ref"]).startswith(today)
    }

    todo = [q for q in city.web_queries if args.all or q not in done][: args.budget]
    ok = empty = 0
    for q in todo:
        try:
            res = web_search(query=q, limit=args.limit)
        except Exception as exc:
            print(f"FAILED [{q}]: {str(exc)[:70]}")
            continue
        items = ((res or {}).get("data") or {}).get("web") or []
        payload = {
            "data": {
                "results": [
                    {
                        "url": it.get("url", ""),
                        "title": it.get("title", ""),
                        "description": it.get("description", ""),
                    }
                    for it in items
                ]
            }
        }
        ref = store.archive_write(
            "websearch", q, json.dumps(payload, ensure_ascii=False).encode("utf-8"), "json"
        )
        store.record_fetch(con, "websearch", q, ref)
        con.commit()
        ok += 1
        empty += 0 if items else 1
        print(f"bridged [{q}] {len(items)} results -> {ref}")
    print(f"bridged {ok} queries ({empty} empty), {len([q for q in city.web_queries if q not in done]) - ok} left")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
