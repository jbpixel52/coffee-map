"""Offline discovery of Instagram handles from archived profile pages.

Logged-out Instagram profile HTML embeds the profile's own username plus a
handful of related accounts. Mining those suggestions costs no network and
grows the candidate pool; the normal recon -> classify -> attach chain still
vets every handle before it can reach a shop.
"""

from __future__ import annotations

import re
import sqlite3
from collections import defaultdict

from .store import archive_read, upsert_candidate

USERNAME_RE = re.compile(r'"username":"([A-Za-z0-9._]{2,32})"')
MIN_HANDLE_LEN = 4


def known_handles(con: sqlite3.Connection) -> set[str]:
    """Handles already profiled, linked to a place, or queued as candidates."""
    known = {r["handle"].strip().lower() for r in con.execute("SELECT handle FROM ig_profiles")}
    known |= {
        (r["instagram"] or "").strip().lower()
        for r in con.execute("SELECT instagram FROM places WHERE instagram IS NOT NULL")
    }
    known |= {
        r["key"].lstrip("@").strip().lower()
        for r in con.execute("SELECT key FROM candidates WHERE kind='ig'")
    }
    known.discard("")
    return known


def suggestions(con: sqlite3.Connection) -> dict[str, set[str]]:
    """Suggested handle -> the archived profiles that mention it."""
    known = known_handles(con)
    out: dict[str, set[str]] = defaultdict(set)
    rows = con.execute(
        "SELECT handle, archive_ref FROM ig_profiles WHERE archive_ref IS NOT NULL"
    )
    for row in rows:
        own = (row["handle"] or "").strip().lower()
        try:
            html = archive_read(row["archive_ref"]).decode("utf-8", "replace")
        except (OSError, EOFError):
            continue  # truncated or pruned archive: skip one page, keep the run
        for name in set(USERNAME_RE.findall(html)):
            handle = name.lower()
            if handle == own or handle in known or len(handle) < MIN_HANDLE_LEN:
                continue
            out[handle].add(own)
    return out


def discover(
    con: sqlite3.Connection, limit: int = 200, min_from: int = 1
) -> tuple[int, int]:
    """Queue unseen suggested handles as IG candidates; return (found, queued)."""
    found = suggestions(con)
    ranked = sorted(
        ((h, srcs) for h, srcs in found.items() if len(srcs) >= min_from),
        key=lambda kv: (-len(kv[1]), kv[0]),
    )[:limit]
    for handle, srcs in ranked:
        upsert_candidate(
            con,
            kind="ig",
            key=handle,
            name=handle,
            evidence={"source": "ig-suggested", "from": sorted(srcs)[:5]},
        )
    con.commit()
    return len(found), len(ranked)
