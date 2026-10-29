#!/usr/bin/env python3
"""Clear Instagram attachments that came from a generic match, not from identity.

`ig-attach` matches a place name against a handle and against the profile's display
name. When a profile's display name is pure category ("MATCHA BAR"), the match fires for
every shop in that category: one café's account landed on fourteen matcha shops in
Tijuana. Attachments are additive, so the wrong ones stay forever unless cleared.

The rule is deliberately narrow, because a name mismatch alone is NOT evidence of a bad
attachment — OSM hands us `contact:instagram` for shops whose handle looks nothing like
the name ("El Cerro" ← @elcerro.seattle is fine, and so is any OSM link).

So: only handles attached to many places in one city are suspects, and within those only
attachments where the place contributes no distinctive token to the handle. "Starbucks"
← @starbucks survives; "Mad Matcha" ← @mollymatcha_ does not.

    python3 scripts/revalidate_attachments.py --dry-run
    python3 scripts/revalidate_attachments.py
"""
from __future__ import annotations

import argparse
import collections
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from coffeemap.merge import STOP_TOKENS, norm_name  # noqa: E402

CITIES = {
    "tj": "data/coffeemap.db",
    "sd": "data/coffeemap-sd.db",
    "la": "data/coffeemap-la.db",
    "cdmx-n": "data/coffeemap-cdmx-n.db",
    "cdmx-s": "data/coffeemap-cdmx-s.db",
    "gdl": "data/coffeemap-gdl.db",
    "ens": "data/coffeemap-ens.db",
    "nyc-n": "data/coffeemap-nyc-n.db",
    "nyc-s": "data/coffeemap-nyc-s.db",
    "aus": "data/coffeemap-aus.db",
    "sea": "data/coffeemap-sea.db",
    "sfo": "data/coffeemap-sfo.db",
    "oak": "data/coffeemap-oak.db",
}
# Below this many places a shared handle is a chain with a few branches; the failure
# this targets is one account sprayed across a whole category.
SUSPECT_MIN = 5


def distinctive(name: str, freq: dict[str, int] | None = None, cutoff: int = 0) -> set[str]:
    """Tokens that could identify this place (category words and short words excluded).

    `freq` is the city's document frequency per token: a token that appears in a lot of
    place names is a neighbourhood, not a brand — "brooklyn" sits in 34 New York names,
    which is how one tea shop's account ended up on "Baked in Brooklyn" and 29 others.
    """
    out = set()
    for t in norm_name(name).split():
        if len(t) < 4 or t in STOP_TOKENS:
            continue
        if freq is not None and freq.get(t, 0) >= cutoff:
            continue
        out.add(t)
    return out


def related(place_name: str, handle: str, freq: dict[str, int] | None = None, cutoff: int = 0) -> bool:
    flat = norm_name(handle)
    squash = norm_name(place_name).replace(" ", "")
    # The whole name living inside the handle beats any token logic: "Starbucks" is
    # @starbucks however common the word is, and "Le Pain Quotidien" is
    # @lepainquotidienus.
    if len(squash) >= 6 and squash in flat:
        return True
    # Or the handle's brand words all appear in the place name: "Starbucks (Inside Ralphs)"
    # is a Starbucks even though the extra words stop the whole-name test from firing.
    place_tokens = set(norm_name(place_name).split())
    handle_tokens = {t for t in flat.split() if len(t) >= 3 and t not in STOP_TOKENS}
    if handle_tokens and handle_tokens <= place_tokens:
        return True
    dist = distinctive(place_name, freq, cutoff)
    if dist:
        return any(t in flat for t in dist)
    # Nothing distinctive left ("E&W Kitchen & Café" is all category words): fall back to
    # initials, which is how such a name survives in a handle — "e" and "w" both live in
    # @ew_kitchen_, while "Mad Matcha" has no "mad" in @mollymatcha_.
    initials = {t for t in norm_name(place_name).split() if 1 <= len(t) <= 3 and t not in STOP_TOKENS}
    return bool(initials) and all(t in flat for t in initials)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    total = 0
    for slug, path in CITIES.items():
        if not Path(path).exists():
            continue
        con = sqlite3.connect(path)
        con.row_factory = sqlite3.Row
        all_names = [r["name"] for r in con.execute("SELECT name FROM places")]
        freq: dict[str, int] = collections.Counter()
        for name in all_names:
            for t in set(norm_name(name).split()):
                if len(t) >= 4:
                    freq[t] += 1
        cutoff = max(20, round(0.01 * len(all_names)))
        rows = [dict(r) for r in con.execute("SELECT id, name, instagram FROM places WHERE instagram IS NOT NULL")]
        by_handle: dict[str, list[dict]] = collections.defaultdict(list)
        for r in rows:
            by_handle[r["instagram"].strip().lower()].append(r)

        clear = [
            (p["id"], p["name"], handle)
            for handle, places in by_handle.items()
            if len(places) >= SUSPECT_MIN
            for p in places
            if not related(p["name"], handle, freq, cutoff)
        ]
        if clear:
            print(f"{slug:8s} {len(clear):3d} generic attachments:")
            for _, name, handle in clear[:8]:
                print(f"          {name!r} <- @{handle}")
            if not args.dry_run:
                con.executemany("UPDATE places SET instagram=NULL WHERE id=?", [(i,) for i, _, _ in clear])
                con.commit()
        total += len(clear)
    print(f"{'would clear' if args.dry_run else 'cleared'} {total} attachments")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
