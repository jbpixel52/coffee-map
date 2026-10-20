"""Google Maps search source: fetch (patchright) + parse (offline, archive-first)."""
from __future__ import annotations

import random
import re

from ..config import ROOT, City

COORD_RE = re.compile(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)")
PLACE_ID_RE = re.compile(r"!19s([A-Za-z0-9_-]{10,})")
PLACE_ID_FALLBACK_RE = re.compile(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)")
CARD_CSS = 'div[role="article"] a[href*="/maps/place/"]'


def ensure_browsers_path() -> None:
    """Point PLAYWRIGHT_BROWSERS_PATH at the project-owned .browsers when present.

    MUST be called before `import patchright`: patchright reads the env var once
    at import time and caches it. An inherited path from the agent runtime
    (e.g. /opt/hermes/tools) points at revisions this patchright never
    installed — launches then fail with `Executable doesn't exist`.
    """
    import os

    ours = ROOT / ".browsers"
    if ours.exists():
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(ours)


def search_url(query: str, city: City) -> str:
    q = query.strip().replace(" ", "+")
    return f"https://www.google.com/maps/search/{q}/@{city.center_lat},{city.center_lon},{city.zoom}z"


def fetch_query(page, query: str, city: City, max_scrolls: int = 6) -> str:
    """Load one query and return the rendered HTML. The caller archives it."""
    page.goto(search_url(query, city), wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(4000)
    feed = page.query_selector('[role="feed"]')
    if feed is not None:
        # Do NOT use feed.hover(): the actionability check hangs on Maps'
        # virtualized feed. Park the mouse over the feed's centre and wheel.
        box = feed.bounding_box()
        if box:
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            for _ in range(max_scrolls):
                page.mouse.wheel(0, 2500)
                page.wait_for_timeout(random.randint(1200, 2500))
    return page.content()


def parse_html(html: str) -> list[dict]:
    """Rendered Google Maps search HTML -> [{source_id, name, lat, lon}, ...]."""
    from selectolax.lexbor import LexborHTMLParser

    tree = LexborHTMLParser(html)
    out: list[dict] = []
    seen: set[str] = set()
    for a in tree.css(CARD_CSS):
        href = a.attributes.get("href") or ""
        name = (a.attributes.get("aria-label") or "").strip()
        m_coord = COORD_RE.search(href)
        m_id = PLACE_ID_RE.search(href) or PLACE_ID_FALLBACK_RE.search(href)
        if not (name and m_coord and m_id):
            continue
        sid = f"gmaps:{m_id.group(1)}"
        if sid in seen:
            continue
        seen.add(sid)
        out.append({
            "source_id": sid,
            "name": name,
            "lat": float(m_coord.group(1)),
            "lon": float(m_coord.group(2)),
        })
    return out
