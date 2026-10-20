"""Instagram source: logged-out profile recon (archive-first, no session).

Verified against live instagram.com (2026-10-19): the logged-out profile page
ships a Relay-preloader payload inside `<script ... data-sjs>` tags — the
profile node and a first page of 12 posts. No metrics when logged out.

Byte-level notes (measured, so a future reader doesn't re-derive them):
- The tag is `<script type="application/json" nonce="…" data-sjs="" ...>` —
  a bare `data-sjs>` selector finds ZERO blobs; match on `data-sjs` presence.
- There are TWO `xig_user_by_username` nodes: the root query (username,
  follower_count, bio…) and the posts-tab query (timeline edges; no username).
  Merge across all blobs — the posts node alone has no username to key on.
- `media_count` is absent in this payload shape; `all_media_count` is the
  profile's own count (None when the account hides it). Report, don't invent.
"""
from __future__ import annotations

import json
import re

SJS_RE = re.compile(r"<script[^>]*data-sjs[^>]*>(.*?)</script>", re.S)
PASSWORD_RE = re.compile(r"<input[^>]+type=\"password\"", re.I)
TIMELINE_KEY = "polaris_ordered_timeline_connection"


def fetch_profile_html(page, handle: str) -> str:
    """One logged-out page load. The caller archives the bytes before parsing."""
    page.goto(f"https://www.instagram.com/{handle}/", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(3000)
    return page.content()


def _collect_xig(node, hits: list[dict]) -> None:
    if isinstance(node, dict):
        cand = node.get("xig_user_by_username")
        if isinstance(cand, dict):
            hits.append(cand)
        for v in node.values():
            _collect_xig(v, hits)
    elif isinstance(node, list):
        for v in node:
            _collect_xig(v, hits)


def parse_profile_html(html: str) -> dict | None:
    """Rendered logged-out profile HTML -> profile dict, or None if no payload."""
    hits: list[dict] = []
    for m in SJS_RE.finditer(html):
        try:
            doc = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        _collect_xig(doc, hits)
    root = next((h for h in hits if h.get("username")), None)
    if root is None:
        return None
    codes: list[str] = []
    for h in hits:
        edges = ((h.get(TIMELINE_KEY) or {}).get("edges")) or []
        for e in edges:
            node = e.get("node") if isinstance(e, dict) else None
            code = node.get("code") if isinstance(node, dict) else None
            if code and code not in codes:
                codes.append(code)
    posts = root.get("all_media_count")
    if posts is None:
        posts = root.get("media_count")
    return {
        "username": root.get("username"),
        "full_name": root.get("full_name"),
        "biography": (root.get("biography") or "")[:220],
        "followers": root.get("follower_count"),
        "posts": posts,
        "post_codes": codes,
    }


def classify_html(html: str) -> str:
    """ok | public | login_required | challenge | not_found | rate_limited | unknown.

    Order matters: `challenge` is checked first (terminal state), then the
    payload (a page that ships its profile is readable no matter what else is
    on it), then the wall markers. `unknown` must stay reachable — it is what
    stops "no public data" from reading as "never loaded".
    """
    if "challenge_required" in html or "/challenge/" in html:
        return "challenge"
    if parse_profile_html(html) is not None:
        return "public"  # logged out, but the profile payload rendered
    low = html.lower()
    if PASSWORD_RE.search(html):
        return "login_required"
    if "page not found" in low or "sorry, this page" in low or "no está disponible" in low:
        return "not_found"
    if "too many requests" in low:
        return "rate_limited"
    return "unknown"
