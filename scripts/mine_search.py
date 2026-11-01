#!/usr/bin/env python3
"""Search the web for a shop's Instagram account: profiles, posts, and link-in-bio pages.

Must run inside the Hermes kernel (`execute_code`), because the search provider is only
registered there:

    import sys, runpy
    sys.argv = ["mine_search.py", "tj", "--limit", "45"]
    runpy.run_path("scripts/mine_search.py", run_name="__main__")

Two conversions matter, because a search almost never returns a bare profile URL:
  * `instagram.com/p/<code>` — the post page names its author, so the handle is recoverable.
  * `linktr.ee/<x>` / `beacons.ai/<x>` — the link-in-bio page lists the profile.

A handle is only accepted when it shares a proper-name token with the shop: category words
are not identity ("matcha" inside @aikomatcha.au is not evidence that a Tijuana café owns an
Australian account). Progress lives in data/reports/ig-search-<city>.json so a batch run
resumes instead of re-searching the same shops.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import unicodedata
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
DBS = {"tj": "data/coffeemap.db", "sd": "data/coffeemap-sd.db"}
PROGRESS = ROOT / "data" / "reports"
IG = re.compile(r"instagram\.com/([A-Za-z0-9._]{2,30})", re.I)
SKIP = {"p", "reel", "reels", "tv", "stories", "explore", "accounts", "instagram", "share"}
POST = re.compile(r"instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]{5,20})")
BIO = re.compile(r"https?://(?:linktr\.ee|beacons\.ai|milkshake\.app|linkr\.bio|taplink\.cc)/[A-Za-z0-9_.-]+", re.I)
FOREIGN = re.compile(r"\.(au|uk|us|ca|es|ar|co|cl|pe|de|fr|it|br)$")
STOP = {"cafe", "cafeteria", "coffee", "shop", "the", "and", "y", "la", "el", "de", "del",
        "los", "las", "tijuana", "matcha", "panaderia", "pasteleria", "bakery", "brunch",
        "restaurant", "restaurante", "bar", "pizza", "tacos", "sushi", "juice", "cream",
        "kitchen", "cocina", "bistro", "roasters", "roastery", "espresso", "brewing"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def tokens(name: str) -> set[str]:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return {t for t in re.split(r"[^a-z0-9]+", s) if len(t) >= 4 and t not in STOP}


def plausible(handle: str, name: str) -> bool:
    if FOREIGN.search(handle.lower()):
        return False
    h, n = norm(handle), norm(name)
    if len(n) >= 5 and (n in h or h in n):
        return True
    # A short token is not identity on its own: "amor" is inside "@amora_restaurant", and
    # "alquimia" is a mezcal brand as often as a café. A short token must also be where the
    # handle starts and be most of it.
    for t in tokens(name):
        if t in h and (len(t) >= 6 or (h.startswith(t) and len(h) <= len(t) + 6)):
            return True
    return False


def handle_from_post(client: httpx.Client, code: str) -> str | None:
    for url in (f"https://www.instagram.com/p/{code}/", f"https://www.instagram.com/reel/{code}/"):
        try:
            html = client.get(url).text
        except Exception:
            continue
        m = re.search(r'"owner":\{[^}]*"username":"([A-Za-z0-9._]{2,30})"', html) or \
            re.search(r'<meta property="og:title" content="([A-Za-z0-9._]{2,30})', html)
        if m:
            return m.group(1)
    return None


def handle_from_bio(client: httpx.Client, url: str) -> str | None:
    try:
        html = client.get(url).text
    except Exception:
        return None
    found = [h for h in IG.findall(html) if h.lower() not in SKIP]
    return max(set(found), key=found.count) if found else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("city", choices=sorted(DBS))
    ap.add_argument("--limit", type=int, default=45)
    ap.add_argument("--attach", action="store_true")
    args = ap.parse_args()

    from hermes_tools import web_search  # only available inside the Hermes kernel

    PROGRESS.mkdir(parents=True, exist_ok=True)
    state_file = PROGRESS / f"ig-search-{args.city}.json"
    state = json.loads(state_file.read_text()) if state_file.exists() else {"searched": [], "hits": {}}
    done = set(state["searched"])

    con = sqlite3.connect(ROOT / DBS[args.city])
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute(
        "SELECT id, name FROM places WHERE (instagram IS NULL OR instagram='') ORDER BY name")]
    todo = [r for r in rows if r["name"] not in done][: args.limit]

    hit = 0
    with httpx.Client(timeout=12, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}) as client:
        for r in todo:
            state["searched"].append(r["name"])
            try:
                res = web_search(query=f'"{r["name"]}" Tijuana instagram', limit=5)
                text = json.dumps(res, ensure_ascii=False)
            except Exception as exc:
                print(f"ERR  {r['name'][:28]}: {str(exc)[:50]}")
                continue
            cands = [h for h in IG.findall(text) if h.lower() not in SKIP]
            for code in list(dict.fromkeys(POST.findall(text)))[:2]:
                got = handle_from_post(client, code)
                if got:
                    cands.append(got)
            for bio in list(dict.fromkeys(BIO.findall(text)))[:2]:
                got = handle_from_bio(client, bio)
                if got:
                    cands.append(got)
            good = next((h for h in dict.fromkeys(cands) if plausible(h, r["name"])), None)
            if not good:
                continue
            hit += 1
            state["hits"][r["id"]] = good
            print(f"HIT  {r['name'][:30]:32s} @{good}")
            if args.attach:
                con.execute("UPDATE places SET instagram=? WHERE id=?", (good, r["id"]))

    if args.attach:
        con.commit()
    state_file.write_text(json.dumps(state, ensure_ascii=False, indent=1))
    left = len([r for r in rows if r["name"] not in set(state["searched"])])
    print(f"{len(todo)} searched, {hit} hits, {len(state['hits'])} total found, {left} shops left")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
