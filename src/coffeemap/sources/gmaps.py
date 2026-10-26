"""Google Maps search source: fetch (patchright) + parse (offline, archive-first)."""
from __future__ import annotations

import random
import re
from collections.abc import Iterable

from ..config import ROOT, City

COORD_RE = re.compile(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)")
PLACE_ID_RE = re.compile(r"!19s([A-Za-z0-9_-]{10,})")
PLACE_ID_FALLBACK_RE = re.compile(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)")
CARD_CSS = 'div[role="article"] a[href*="/maps/place/"]'
ARTICLE_CSS = 'div[role="article"]'

# A card's info block is "Cafetería · Av. Lázaro Cárdenas Nte. 606". Only accept a
# line that starts like a street address: a street-type word (MX) or a house number
# followed by a street suffix (US). Conservative on purpose — a wrong address on the
# card is worse than none.
STREET_START = re.compile(
    r"^(av\.?|avenida|calle|blvd\.?|boulevard|paseo|priv\.?|privada|prol\.?|prolongaci[oó]n|"
    r"and\.?|andador|calz\.?|calzada|cerrada|circuito|cto\.?|camino|carretera|fracc\.?|"
    r"fraccionamiento|col\.?|colonia|ejido|r[uá]stico)\s",
    re.IGNORECASE,
)
US_START = re.compile(
    r"^\d{1,6}\s+\S.*\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|way|lane|ln|"
    r"ct|court|pl|place|ter|terrace|pkwy|parkway|hwy|highway|cir|circle)\b",
    re.IGNORECASE,
)


PUA_RE = re.compile(r"[\ue000-\uf8ff]")  # icon-font glyphs Google mixes into the info block


def format_gmaps_address(lines: Iterable[str]) -> str | None:
    """Card text lines -> the segment that reads as a street address, else None.

    Google packs the info block differently per locale: "Cafetería · Av. X 123" in
    Mexico (with a directions glyph in between), "Café · 1234 W Main St" in the US.
    Split on the middle dot and test each segment instead of only the line start.
    """
    for raw in lines:
        line = " ".join(PUA_RE.sub(" ", raw or "").split())
        if not any(ch.isdigit() for ch in line):
            continue
        for seg in (line, *line.split("·")):
            seg = seg.strip(" ·•-–—.,|:\t")
            if not (6 <= len(seg) <= 90) or not any(ch.isdigit() for ch in seg):
                continue
            if STREET_START.match(seg) or US_START.match(seg):
                return seg
    return None


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
    for article in tree.css(ARTICLE_CSS):
        a = article.css_first('a[href*="/maps/place/"]')
        if a is None:
            continue
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
        texts = [n.text() for n in article.css("div.W4Efsd span, div.W4Efsd div")]
        out.append({
            "source_id": sid,
            "name": name,
            "lat": float(m_coord.group(1)),
            "lon": float(m_coord.group(2)),
            "address": format_gmaps_address(texts),
        })
    return out
