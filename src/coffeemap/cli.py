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
    upsert_candidate,
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
    p = sub.add_parser(
        "ig-discover",
        help="mine archived IG profile pages for suggested handles (offline, no network)",
    )
    p.add_argument("--limit", type=int, default=200)
    p.add_argument(
        "--min-from",
        type=int,
        default=1,
        help="minimum distinct source profiles that must suggest a handle",
    )
    p = sub.add_parser("web-search", help="query the local search service and archive SERPs")
    p.add_argument("--limit", type=int, default=10)
    p = sub.add_parser("web-scrape", help="scrape directory/blog pages from archived SERPs")
    p.add_argument("--per-query", type=int, default=5)
    sub.add_parser("web-candidates", help="extract café candidates from archived web payloads")
    sub.add_parser("classify-validate", help="run the labeled battery through the local model")
    p = sub.add_parser("classify-candidates", help="classify pending café candidates via the local model")
    p.add_argument("--kinds", default="place,name")
    p.add_argument("--refresh", action="store_true")
    sub.add_parser("ig-enrich", help="re-parse archived IG profiles: full_name + latest post code (offline)")
    sub.add_parser("ig-attach", help="attach IG profiles to places by name/handle match")
    p = sub.add_parser("classify-places", help="gate gmaps/web places through the local model")
    p.add_argument("--limit", type=int, default=1500)
    sub.add_parser("candidates-apply", help="promote café-verdict candidates to places (dedupe vs existing)")
    sub.add_parser("merge", help="rebuild canonical shops from places")
    sub.add_parser("export", help="write web-astro/public/data (geojson + meta)")
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
        for table in ("places", "shops", "ig_profiles", "fetches", "candidates"):
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
                   WHERE instagram IS NOT NULL AND instagram <> ''""",
            )
        ]
        from_cands = [
            r["key"].lstrip("@")
            for r in con.execute("SELECT key FROM candidates WHERE kind='ig'")
        ]
        known = {r["handle"] for r in con.execute("SELECT handle FROM ig_profiles")}
        handles = sorted({h for h in (*handles, *from_cands) if h and h not in known})[: args.limit]
        print(f"ig-recon: {len(handles)} handles pending (known: {len(known)})")
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
                    """INSERT INTO ig_profiles (handle, full_name, followers, posts, last_post_at,
                                                latest_code, capture_state, fetched_at, archive_ref)
                       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
                       ON CONFLICT (handle) DO UPDATE SET
                         full_name=excluded.full_name, followers=excluded.followers,
                         posts=excluded.posts, latest_code=excluded.latest_code,
                         capture_state=excluded.capture_state,
                         fetched_at=excluded.fetched_at, archive_ref=excluded.archive_ref""",
                    (
                        handle,
                        prof["full_name"] if prof else None,
                        prof["followers"] if prof else None,
                        prof["posts"] if prof else None,
                        (prof["post_codes"] or [None])[0] if prof else None,
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
    elif args.cmd == "web-search":
        import json

        from .sources import web

        for q in city.web_queries:
            payload = web.search(q, limit=args.limit)
            ref = archive_write(
                "websearch", q, json.dumps(payload, ensure_ascii=False).encode("utf-8"), "json"
            )
            record_fetch(con, "websearch", q, ref)
            print(f"web-search [{q}] {len(web.search_results(payload))} results -> {ref}")
    elif args.cmd == "web-scrape":
        import json

        from .sources import web

        latest: dict[str, str] = {}
        for r in con.execute("SELECT key, archive_ref FROM fetches WHERE source='websearch' ORDER BY id"):
            latest[r["key"]] = r["archive_ref"]
        done = {r["key"] for r in con.execute("SELECT key FROM fetches WHERE source='webpage'")}
        scraped = failed = 0

        def _grab(url: str) -> None:
            nonlocal scraped, failed
            try:
                page = web.scrape(url)
            except web.CrwError as exc:
                failed += 1
                print(f"web-scrape FAIL {url}: {exc}")
                return
            md = web.scrape_markdown(page)
            if not md:
                failed += 1
                print(f"web-scrape EMPTY {url}")
                return
            pref = archive_write(
                "webpage", url, json.dumps(page, ensure_ascii=False).encode("utf-8"), "json"
            )
            record_fetch(con, "webpage", url, pref)
            done.add(url)
            scraped += 1
            print(f"web-scrape {url} -> {len(md)} chars")
            time.sleep(random.randint(2, 5))  # politeness: crw fetches these from the live web

        for q, ref in latest.items():
            payload = json.loads(archive_read(ref))
            for url in web.candidate_pages(web.search_results(payload), per_query=args.per_query):
                if url not in done:
                    _grab(url)
        for url in city.web_extra_pages:
            if url not in done:
                _grab(url)
        print(f"web-scrape: {scraped} pages archived, {failed} failed")
    elif args.cmd == "web-candidates":
        import json

        from .merge import norm_name

        from .sources import web

        n_place = n_name = n_ig = 0
        for r in con.execute("SELECT key, archive_ref FROM fetches WHERE source='webpage' ORDER BY id"):
            payload = json.loads(archive_read(r["archive_ref"]))
            md = web.scrape_markdown(payload)
            url = r["key"]
            for li in web.extract_gmaps_links(md):
                upsert_candidate(
                    con,
                    kind="place",
                    key=norm_name(li["name"]),
                    name=li["name"],
                    lat=li["lat"],
                    lon=li["lon"],
                    gmaps_source_id=li["source_id"],
                    evidence={"source": "webpage", "url": url},
                )
                n_place += 1
            for nm in web.extract_list_names(md):
                upsert_candidate(
                    con,
                    kind="name",
                    key=norm_name(nm["name"]),
                    name=nm["name"],
                    evidence={"source": "webpage", "url": url},
                )
                n_name += 1
            for h in web.extract_ig_links(md):
                upsert_candidate(
                    con, kind="ig", key="@" + h.lower(), evidence={"source": "webpage", "url": url}
                )
                n_ig += 1
        for r in con.execute("SELECT key, archive_ref FROM fetches WHERE source='websearch' ORDER BY id"):
            payload = json.loads(archive_read(r["archive_ref"]))
            for it in web.extract_ig_from_serp(web.search_results(payload)):
                upsert_candidate(
                    con,
                    kind="ig",
                    key="@" + it["handle"].lower(),
                    name=it["name"],
                    followers_hint=it["followers_hint"],
                    evidence={"source": "websearch", "query": r["key"], "url": it["url"]},
                )
                n_ig += 1
        con.commit()
        tot = con.execute("SELECT COUNT(*) FROM candidates").fetchone()[0]
        print(
            f"web-candidates: {n_place} gmaps-link hits, {n_name} list names, "
            f"{n_ig} ig hits -> {tot} unique candidates"
        )
    elif args.cmd == "classify-validate":
        from .classify import MODEL_TAG, validate

        passed, failures = validate()
        total = passed + len(failures)
        print(f"classify-validate via {MODEL_TAG}: {passed}/{total}")
        for f in failures:
            print("  FAIL:", f)
        return 0 if not failures else 1
    elif args.cmd == "classify-candidates":
        from .classify import MODEL_TAG, classify

        kinds = ("place", "name", "ig") if args.kinds == "all" else tuple(args.kinds.split(","))
        where = f"kind IN ({','.join('?' for _ in kinds)})"
        if not args.refresh:
            where += " AND verdict IS NULL"
        rows = [
            dict(r)
            for r in con.execute(
                f"SELECT * FROM candidates WHERE {where} ORDER BY kind, id", kinds
            )
        ]
        print(f"classify-candidates: {len(rows)} to classify via {MODEL_TAG}")
        counts: dict[str, int] = {}
        for i, row in enumerate(rows, 1):
            if row["kind"] == "ig":
                label = row["name"] or ("@" + row["key"].lstrip("@"))
                hint = "Instagram account"
            else:
                label = row["name"]
                hint = ""
            verdict, raw = classify(label, hint)
            counts[verdict or "unparsed"] = counts.get(verdict or "unparsed", 0) + 1
            con.execute(
                "UPDATE candidates SET verdict=?, verdict_model=?, verdict_reason=?, verdict_at=? WHERE id=?",
                (verdict, MODEL_TAG, raw, now_utc(), row["id"]),
            )
            con.commit()
            print(f"  [{i}/{len(rows)}] {row['kind']:5s} {label[:48]!r} -> {verdict}")
        print("verdicts:", counts)
    elif args.cmd == "ig-discover":
        # Offline discovery: logged-out profile HTML embeds the profile's own
        # username plus a handful of related accounts. Mine the archive for
        # those, drop anything already known, and queue the rest as IG
        # candidates for the normal recon -> classify -> attach chain.
        import gzip
        import re
        from pathlib import Path

        from .config import ARCHIVE

        name_re = re.compile(r"^ig\.(.+)\.([0-9a-f]{10})\.html\.gz$")
        user_re = re.compile(r'"username":"([A-Za-z0-9._]{2,32})"')

        known = {r["handle"].lower() for r in con.execute("SELECT handle FROM ig_profiles")}
        known |= {
            (r["instagram"] or "").strip().lower()
            for r in con.execute("SELECT instagram FROM places WHERE instagram IS NOT NULL")
        }
        known |= {
            r["key"].lstrip("@").lower()
            for r in con.execute("SELECT key FROM candidates WHERE kind='ig'")
        }
        known.discard("")

        suggested: dict[str, set[str]] = {}
        pages = 0
        for path in sorted(Path(ARCHIVE).glob("**/ig.*.html.gz")):
            m = name_re.match(path.name)
            if not m:
                continue
            own = m.group(1).lower()
            pages += 1
            try:
                html = gzip.decompress(path.read_bytes()).decode("utf-8", "replace")
            except (OSError, EOFError):
                continue  # truncated archive: skip, do not fail the run
            for handle in set(user_re.findall(html)):
                h = handle.lower()
                if h == own or h in known or len(h) < 4:
                    continue
                suggested.setdefault(h, set()).add(own)

        ranked = sorted(
            ((h, srcs) for h, srcs in suggested.items() if len(srcs) >= args.min_from),
            key=lambda kv: (-len(kv[1]), kv[0]),
        )[: args.limit]

        for handle, srcs in ranked:
            upsert_candidate(
                con,
                kind="ig",
                key=handle,
                name=handle,
                evidence={"source": "ig-suggested", "from": sorted(srcs)[:5]},
            )
        con.commit()
        print(
            f"ig-discover: {pages} archived pages -> {len(suggested)} unseen handles, "
            f"{len(ranked)} queued"
        )
        print("next: ig-recon --limit N; ig-enrich; classify-candidates --kinds ig; ig-attach")
    elif args.cmd == "ig-enrich":
        from .sources.ig import classify_html, parse_profile_html

        rows = [dict(r) for r in con.execute("SELECT * FROM ig_profiles ORDER BY handle")]
        upd = 0
        for row in rows:
            if not row["archive_ref"]:
                continue
            html = archive_read(row["archive_ref"]).decode("utf-8", "replace")
            prof = parse_profile_html(html) if classify_html(html) == "public" else None
            codes = (prof or {}).get("post_codes") or []
            con.execute(
                """UPDATE ig_profiles SET full_name=?, followers=?, posts=?, latest_code=?
                   WHERE handle=?""",
                (
                    (prof or {}).get("full_name") or row["full_name"],
                    (prof or {}).get("followers") or row["followers"],
                    (prof or {}).get("posts") or row["posts"],
                    codes[0] if codes else row["latest_code"],
                    row["handle"],
                ),
            )
            con.commit()
            upd += 1
            print(
                f"ig-enrich {row['handle']}: code={codes[0] if codes else '-'} "
                f"full={(prof or {}).get('full_name')!r}"
            )
        print(f"ig-enrich: re-parsed {upd} archived profiles (offline, no network)")
    elif args.cmd == "ig-attach":
        from .merge import name_match

        places = [dict(r) for r in con.execute("SELECT * FROM places ORDER BY id")]
        profs = [dict(r) for r in con.execute("SELECT * FROM ig_profiles ORDER BY handle")]
        allowed = {
            r["key"].lstrip("@").lower(): r["verdict"]
            for r in con.execute("SELECT * FROM candidates WHERE kind='ig'")
        }
        set_links = pairs = skipped = 0
        for pr in profs:
            h = pr["handle"]
            verdict = allowed.get(h.lower(), "__nosource__")
            matches = [
                pl
                for pl in places
                if name_match(pl["name"], h) or (pr["full_name"] and name_match(pl["name"], pr["full_name"]))
            ]
            cafe_matches = [pl for pl in matches if (pl["verdict"] or "cafe") != "not_cafe"]
            # The 1.5B model marks some real café-brand handles NOT_CAFE (it
            # dislikes handles); a name-match to a confirmed café place is
            # stronger evidence than that verdict.
            if verdict == "not_cafe" and not cafe_matches:
                skipped += 1
                print(f"ig-attach {h}: skipped (verdict={verdict})")
                continue
            if not matches:
                print(f"ig-attach {h}: no matching place")
                continue
            for pl in cafe_matches or matches:
                pairs += 1
                if not (pl["instagram"] or "").strip():
                    con.execute("UPDATE places SET instagram=? WHERE id=?", (h, pl["id"]))
                    set_links += 1
                print(f"ig-attach {h} -> {pl['name']!r} [{pl['source']}]")
        con.commit()
        print(f"ig-attach: {set_links} new links on {pairs} pairs ({skipped} handles skipped by verdict)")
    elif args.cmd == "classify-places":
        from .classify import MODEL_TAG, classify

        rows = [
            dict(r)
            for r in con.execute(
                """SELECT * FROM places
                   WHERE source IN ('gmaps', 'web') AND verdict IS NULL
                   ORDER BY id LIMIT ?""",
                (args.limit,),
            )
        ]
        print(f"classify-places: {len(rows)} places via {MODEL_TAG}")
        counts: dict[str, int] = {}
        for i, row in enumerate(rows, 1):
            verdict, raw = classify(row["name"])
            counts[verdict or "unparsed"] = counts.get(verdict or "unparsed", 0) + 1
            con.execute(
                "UPDATE places SET verdict=?, verdict_model=?, verdict_reason=?, verdict_at=? WHERE id=?",
                (verdict, MODEL_TAG, raw, now_utc(), row["id"]),
            )
            con.commit()
            if verdict != "cafe" or i % 25 == 0:
                print(f"  [{i}/{len(rows)}] {row['name'][:52]!r} -> {verdict}")
        print("verdicts:", counts)
    elif args.cmd == "candidates-apply":
        from .merge import haversine_m, name_match

        places = [dict(r) for r in con.execute("SELECT * FROM places ORDER BY id")]
        cands = [
            dict(r)
            for r in con.execute("SELECT * FROM candidates WHERE verdict='cafe' ORDER BY kind, id")
        ]
        added = matched = enriched = unresolved = 0
        for c in cands:
            if c["kind"] == "ig":
                continue  # ig handles enrich existing places via ig-attach
            if c["kind"] == "place" and c["lat"] is not None and c["lon"] is not None:
                near, dist = None, None
                for pl in places:
                    d = haversine_m(c["lat"], c["lon"], pl["lat"], pl["lon"])
                    if d <= 120 and name_match(pl["name"], c["name"], ratio_min=0.70):
                        near, dist = pl, d
                        break
                if near is not None:
                    matched += 1
                    print(f"candidates-apply EXISTS {c['name']!r} ~ {near['name']!r} ({dist:.0f}m)")
                else:
                    sid = c["gmaps_source_id"] or f"web:{c['key']}"
                    src = "gmaps" if c["gmaps_source_id"] else "web"
                    upsert_place(
                        con,
                        source=src,
                        source_id=sid,
                        name=c["name"],
                        lat=c["lat"],
                        lon=c["lon"],
                        website=c["website"],
                        instagram=c["ig_handle"],
                        archive_ref=None,
                    )
                    added += 1
                    places.append(
                        {
                            "id": -1, "name": c["name"], "lat": c["lat"], "lon": c["lon"],
                            "instagram": c["ig_handle"], "website": c["website"],
                            "source": src, "source_id": sid,
                        }
                    )
                    print(f"candidates-apply ADD {c['name']!r} @ {c['lat']:.5f},{c['lon']:.5f}")
                continue
            # name-only candidates: resolve against existing places or report
            hit = next((pl for pl in places if name_match(pl["name"], c["name"], ratio_min=0.70)), None)
            if hit is not None:
                matched += 1
                if c["ig_handle"] and not (hit["instagram"] or "").strip():
                    con.execute("UPDATE places SET instagram=? WHERE id=?", (c["ig_handle"], hit["id"]))
                    enriched += 1
                print(f"candidates-apply MATCH {c['name']!r} -> {hit['name']!r}")
            else:
                unresolved += 1
                print(f"candidates-apply UNRESOLVED {c['name']!r} (name only, no local match)")
        con.commit()
        print(
            f"candidates-apply: {added} added, {matched} matched, "
            f"{enriched} enriched, {unresolved} unresolved"
        )
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
