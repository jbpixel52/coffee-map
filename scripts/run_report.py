#!/usr/bin/env python3
"""Write one HTML page that says what the pipeline actually has, per city.

A refresh is otherwise audited by reading `data/logs/*.log` and running `status` eleven
times. This walks every city DB, reads the same numbers `coffeemap status --json` reports,
and writes a single page: counts, places by source, Instagram capture states, and the last
few fetches.

    python3 scripts/run_report.py                 # -> data/reports/refresh-<date>.html
    python3 scripts/run_report.py --out /tmp/r.html
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CITIES = [
    ("tj", "Tijuana", "data/coffeemap.db"),
    ("sd", "San Diego", "data/coffeemap-sd.db"),
    ("la", "Los Angeles", "data/coffeemap-la.db"),
    ("cdmx-n", "Mexico City (north)", "data/coffeemap-cdmx-n.db"),
    ("cdmx-s", "Mexico City (south)", "data/coffeemap-cdmx-s.db"),
    ("gdl", "Guadalajara", "data/coffeemap-gdl.db"),
    ("ens", "Ensenada", "data/coffeemap-ens.db"),
    ("nyc-n", "New York City (north)", "data/coffeemap-nyc-n.db"),
    ("nyc-s", "New York City (south)", "data/coffeemap-nyc-s.db"),
    ("aus", "Austin", "data/coffeemap-aus.db"),
    ("sea", "Seattle", "data/coffeemap-sea.db"),
    ("sfo", "San Francisco", "data/coffeemap-sfo.db"),
    ("oak", "Oakland", "data/coffeemap-oak.db"),
]

TABLES = ("places", "shops", "ig_profiles", "fetches", "candidates")


def read_city(path: Path) -> dict:
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    counts = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in TABLES}
    by_source = {
        r["source"]: r["n"] for r in con.execute("SELECT source, COUNT(*) n FROM places GROUP BY source")
    }
    ig = {
        (r["capture_state"] or "pending"): r["n"]
        for r in con.execute("SELECT capture_state, COUNT(*) n FROM ig_profiles GROUP BY capture_state")
    }
    latest = [dict(r) for r in con.execute("SELECT source, key, fetched_at FROM fetches ORDER BY id DESC LIMIT 3")]
    con.close()
    return {"counts": counts, "by_source": by_source, "ig": ig, "latest": latest}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out = Path(args.out) if args.out else ROOT / "data" / "reports" / f"refresh-{dt.date.today()}.html"
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for slug, name, rel in CITIES:
        path = ROOT / rel
        if not path.exists():
            rows.append(f"<tr><td>{html.escape(name)}</td><td colspan=6 class=miss>no database</td></tr>")
            continue
        d = read_city(path)
        c = d["counts"]
        ig_total = sum(d["ig"].values())
        ig_public = d["ig"].get("public", 0)
        last = d["latest"][0] if d["latest"] else {}
        rows.append(
            "<tr>"
            f"<td>{html.escape(name)}</td>"
            f"<td class=n>{c['places']:,}</td><td class=n>{c['shops']:,}</td>"
            f"<td class=n>{ig_public:,}/{ig_total:,}</td>"
            f"<td class=n>{d['by_source'].get('osm', 0):,}</td><td class=n>{d['by_source'].get('gmaps', 0):,}</td>"
            f"<td class=small>{html.escape(str(last.get('key', '—')))[:38]}<br>{html.escape(str(last.get('fetched_at', '')))}</td>"
            "</tr>"
        )

    total_shops = sum(
        read_city(ROOT / rel)["counts"]["shops"] for _, _, rel in CITIES if (ROOT / rel).exists()
    )
    out.write_text(
        f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<title>coffee-map refresh — {stamp}</title>
<style>
 body{{font:14px/1.45 ui-sans-serif,system-ui,sans-serif;margin:32px;color:#1f1d1a;background:#faf7f0}}
 h1{{font-size:20px;margin:0 0 4px}}p.sub{{margin:0 0 20px;color:#6b665e;font-size:12px}}
 table{{border-collapse:collapse;width:100%;max-width:1000px}}
 th{{text-align:left;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#6b665e;
     border-bottom:1px solid #d9d3c6;padding:6px 8px}}
 td{{padding:7px 8px;border-bottom:1px solid #ece7db}}
 td.n{{text-align:right;font-variant-numeric:tabular-nums}}
 td.small{{font-size:11px;color:#6b665e}}
 .miss{{color:#b3402f}}
</style></head><body>
<h1>Refresh report</h1>
<p class=sub>{stamp} · {total_shops:,} shop rows across {len(CITIES)} databases (Mexico City and New York are
fetched as two bbox tiles, so a merged count is lower — check <code>meta.json</code> for what ships) ·
Instagram column is public profiles / profiles known</p>
<table><thead><tr><th>City</th><th>Places</th><th>Shops</th><th>Instagram</th><th>OSM</th><th>Maps</th><th>Last fetch</th></tr></thead>
<tbody>{''.join(rows)}</tbody></table></body></html>""",
        encoding="utf-8",
    )
    print(f"wrote {out} ({total_shops:,} shops)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
