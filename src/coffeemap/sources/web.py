"""Web tier: search-service SERPs + listicle scraping + candidate extraction.

Transport goes through the local search service (fastCRW) on the docker network.
Archive-first: the raw search JSON and every scraped page land under data/archive
before any extractor below runs. Extractors are pure string functions over
markdown / SERP items so they stay testable offline.
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request

CRW_BASE = "http://172.18.0.15:3000"


class CrwError(RuntimeError):
    """The local search/scrape service failed or returned non-JSON."""


def _post(path: str, payload: dict, timeout: float) -> dict:
    req = urllib.request.Request(
        CRW_BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
    except OSError as exc:  # connection refused / timeout / HTTP status errors
        raise CrwError(f"POST {path} failed: {exc}") from exc
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise CrwError(f"POST {path} returned non-JSON ({len(body)} bytes)") from exc


def search(query: str, limit: int = 10, timeout: float = 60.0) -> dict:
    return _post("/v1/search", {"query": query, "limit": limit}, timeout)


def scrape(url: str, timeout: float = 120.0) -> dict:
    return _post("/v1/scrape", {"url": url}, timeout)


def search_results(payload: dict) -> list[dict]:
    return ((payload or {}).get("data") or {}).get("results") or []


def scrape_markdown(payload: dict) -> str:
    return ((payload or {}).get("data") or {}).get("markdown") or ""


# ---------------------------------------------------------------- extraction

GMAPS_PLACE_RE = re.compile(
    r"https?://(?:www\.)?google\.com/maps/place/([^/\s?#]+)/data=[^\s\"')]*"
)
COORD_RE = re.compile(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)")
PLACE_ID_RE = re.compile(r"!19s([A-Za-z0-9_-]{10,})")

IG_LINK_RE = re.compile(r"https?://(?:www\.)?instagram\.com/([A-Za-z0-9_.]{3,30})")
IG_RESERVED = {
    "p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct",
    "about", "legal", "privacy", "developer", "developers", "api",
}
IG_TITLE_RE = re.compile(r"^(?P<name>.{1,90}?)\s*[\(\（]@(?P<handle>[A-Za-z0-9_.]{3,30})[\)\）]")
FOLLOWERS_RE = re.compile(r"([\d.,]+\s*[KMB]?)\+?\s+followers", re.I)

# "1. Cafe de la Flor - Plaza Río" style link text on ranked list pages
# (Tripadvisor escapes the digits: "[1\. Cafe ...](/Restaurant_Review-...)").
TA_LIST_RE = re.compile(
    r"\[\s*\d+\\?\.\s*(?P<name>[^\]\[]{2,90}?)\s*(?:[-–—][^\]]*)?\]"
    r"\((?P<url>[^)\s]*(?:Restaurant_Review|/biz/)[^)\s]*)\)"
)


def norm_handle(text: str) -> str:
    return text.strip().lower().lstrip("@")


def extract_gmaps_links(md: str) -> list[dict]:
    """Google Maps place links embedded in a page -> candidates with coordinates."""
    out: list[dict] = []
    seen: set[str] = set()
    for m in GMAPS_PLACE_RE.finditer(md):
        url = m.group(0)
        mc, mi = COORD_RE.search(url), PLACE_ID_RE.search(url)
        if not (mc and mi):
            continue
        sid = f"gmaps:{mi.group(1)}"
        if sid in seen:
            continue
        seen.add(sid)
        name = urllib.parse.unquote_plus(m.group(1)).strip()
        if not name:
            continue
        out.append(
            {
                "name": name,
                "lat": float(mc.group(1)),
                "lon": float(mc.group(2)),
                "source_id": sid,
                "url": url,
            }
        )
    return out


def extract_ig_links(md: str) -> list[str]:
    """Instagram handles linked from a page (profiles only, not posts/reels)."""
    handles: list[str] = []
    for m in IG_LINK_RE.finditer(md):
        h = norm_handle(m.group(1))
        if h.lower() in IG_RESERVED:
            continue
        if h not in handles:
            handles.append(h)
    return handles


def parse_followers_hint(text: str) -> int | None:
    m = FOLLOWERS_RE.search(text or "")
    if not m:
        return None
    raw = m.group(1).replace(",", "").replace(" ", "").upper()
    try:
        if raw.endswith("K"):
            return int(float(raw[:-1]) * 1_000)
        if raw.endswith("M"):
            return int(float(raw[:-1]) * 1_000_000)
        if raw.endswith("B"):
            return int(float(raw[:-1]) * 1_000_000_000)
        return int(float(raw))
    except ValueError:
        return None


def extract_ig_from_serp(items: list[dict]) -> list[dict]:
    """SERP items that point at Instagram profiles -> {name, handle, followers_hint, url}."""
    out: list[dict] = []
    for it in items:
        url = (it.get("url") or "").strip()
        m = IG_LINK_RE.match(url + "/")
        if not m or norm_handle(m.group(1)).lower() in IG_RESERVED:
            continue
        handle = norm_handle(m.group(1))
        title = it.get("title") or ""
        name = ""
        tm = IG_TITLE_RE.match(title)
        if tm:
            name = tm.group("name").strip(" -·|")
            handle = norm_handle(tm.group("handle"))
        desc = it.get("description") or it.get("snippet") or ""
        out.append(
            {
                "name": name,
                "handle": handle,
                "followers_hint": parse_followers_hint(desc),
                "url": url,
            }
        )
    return out


def extract_list_names(md: str) -> list[dict]:
    """Ranked directory entries ('1. Cafe Foo - bar') -> {name, url} without coords."""
    out: list[dict] = []
    for m in TA_LIST_RE.finditer(md):
        name = re.sub(r"\s+", " ", m.group("name")).strip(" -–—")
        if len(name) < 3:
            continue
        out.append({"name": name, "url": m.group("url")})
    return out


# ---------------------------------------------------------------- page picking

_SKIP_HOSTS = (
    "instagram.com", "facebook.com", "youtube.com", "tiktok.com", "twitter.com",
    "x.com", "pinterest.", "linkedin.com", "openstreetmap.org", "google.com",
    "whatsapp.com", "threads.net",
)
_PRIORITY = ("tripadvisor", "yelp", "reddit", "blog", "lista", "mejores", "guide",
             "guia", "top", "best")


def candidate_pages(items: list[dict], per_query: int = 5) -> list[str]:
    """Pick scrape-worthy result URLs: ranked directories + blogs, socials skipped."""
    scored: list[tuple[int, str]] = []
    for pos, it in enumerate(items):
        url = (it.get("url") or "").strip()
        if not url or any(h in url.lower() for h in _SKIP_HOSTS):
            continue
        title = (it.get("title") or "").lower()
        score = sum(2 for k in _PRIORITY if k in url.lower() or k in title)
        score += 1 if any(k in url.lower() for k in ("cafe", "coffee", "cafeteria")) else 0
        scored.append((score * 1000 - pos, url))  # score first, SERP order as tiebreak
    scored.sort(reverse=True)
    picked: list[str] = []
    for _, url in scored:
        if url not in picked:
            picked.append(url)
        if len(picked) >= per_query:
            break
    return picked
