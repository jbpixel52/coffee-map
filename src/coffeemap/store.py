"""SQLite store + content archive. Archive-first: bytes hit disk before parsers."""
from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .config import ARCHIVE, DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    website TEXT,
    instagram TEXT,
    verdict TEXT,
    verdict_model TEXT,
    verdict_reason TEXT,
    verdict_at TEXT,
    fetched_at TEXT NOT NULL,
    archive_ref TEXT,
    UNIQUE (source, source_id)
);
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_places (
    shop_id INTEGER NOT NULL,
    place_id INTEGER NOT NULL,
    PRIMARY KEY (shop_id, place_id)
);
CREATE TABLE IF NOT EXISTS ig_profiles (
    handle TEXT PRIMARY KEY,
    full_name TEXT,
    followers INTEGER,
    posts INTEGER,
    last_post_at TEXT,
    latest_code TEXT,
    capture_state TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    archive_ref TEXT
);
CREATE TABLE IF NOT EXISTS fetches (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    key TEXT NOT NULL,
    archive_ref TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,               -- 'place' (has coords) | 'name' (needs lookup) | 'ig'
    key TEXT NOT NULL,                -- norm(name) for place/name, '@handle' for ig
    name TEXT NOT NULL DEFAULT '',
    ig_handle TEXT,
    website TEXT,
    lat REAL,
    lon REAL,
    gmaps_source_id TEXT,
    followers_hint INTEGER,
    evidence TEXT NOT NULL DEFAULT '[]',
    verdict TEXT,                     -- NULL | 'cafe' | 'not_cafe' | 'unsure'
    verdict_model TEXT,
    verdict_reason TEXT,
    verdict_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (kind, key)
);
"""


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    # Additive migrations for DBs created before these columns existed.
    cols = {r["name"] for r in con.execute("PRAGMA table_info(ig_profiles)")}
    if "latest_code" not in cols:
        con.execute("ALTER TABLE ig_profiles ADD COLUMN latest_code TEXT")
    if "full_name" not in cols:
        con.execute("ALTER TABLE ig_profiles ADD COLUMN full_name TEXT")
    pcols = {r["name"] for r in con.execute("PRAGMA table_info(places)")}
    for col in ("verdict", "verdict_model", "verdict_reason", "verdict_at"):
        if col not in pcols:
            con.execute(f"ALTER TABLE places ADD COLUMN {col} TEXT")
    con.commit()
    return con


def archive_write(source: str, key: str, body: bytes, ext: str, root: Path | None = None) -> str:
    """Write gzipped bytes under data/archive/<date>/; return the relative ref."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    digest = hashlib.sha1(body).hexdigest()[:10]
    safe = "".join(c if c.isalnum() or c in "-._" else "_" for c in key)[:60]
    rel = f"{day}/{source}.{safe}.{digest}.{ext}.gz"
    target = (root or ARCHIVE) / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_bytes(gzip.compress(body))
    return rel


def archive_read(ref: str, root: Path | None = None) -> bytes:
    return gzip.decompress(((root or ARCHIVE) / ref).read_bytes())


def record_fetch(con: sqlite3.Connection, source: str, key: str, archive_ref: str) -> None:
    con.execute(
        "INSERT INTO fetches (source, key, archive_ref, fetched_at) VALUES (?, ?, ?, ?)",
        (source, key, archive_ref, now_utc()),
    )
    con.commit()


def latest_fetch(con: sqlite3.Connection, source: str) -> str | None:
    row = con.execute(
        "SELECT archive_ref FROM fetches WHERE source = ? ORDER BY id DESC LIMIT 1", (source,)
    ).fetchone()
    return row["archive_ref"] if row else None


def upsert_place(
    con: sqlite3.Connection,
    *,
    source: str,
    source_id: str,
    name: str,
    lat: float,
    lon: float,
    website: str | None = None,
    instagram: str | None = None,
    archive_ref: str | None = None,
) -> None:
    con.execute(
        """INSERT INTO places (source, source_id, name, lat, lon, website, instagram,
                               fetched_at, archive_ref)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (source, source_id) DO UPDATE SET
             name = excluded.name, lat = excluded.lat, lon = excluded.lon,
             website = COALESCE(excluded.website, places.website),
             instagram = COALESCE(excluded.instagram, places.instagram),
             fetched_at = excluded.fetched_at, archive_ref = excluded.archive_ref""",
        (source, source_id, name, lat, lon, website, instagram, now_utc(), archive_ref),
    )


def upsert_candidate(
    con: sqlite3.Connection,
    *,
    kind: str,
    key: str,
    name: str = "",
    ig_handle: str | None = None,
    website: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    gmaps_source_id: str | None = None,
    followers_hint: int | None = None,
    evidence: dict | None = None,
) -> None:
    """Insert or enrich a discovery candidate; evidence entries append (deduped)."""
    row = con.execute("SELECT * FROM candidates WHERE kind = ? AND key = ?", (kind, key)).fetchone()
    if row is None:
        con.execute(
            """INSERT INTO candidates (kind, key, name, ig_handle, website, lat, lon,
                                       gmaps_source_id, followers_hint, evidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                kind,
                key,
                name,
                ig_handle,
                website,
                lat,
                lon,
                gmaps_source_id,
                followers_hint,
                json.dumps([evidence] if evidence else [], ensure_ascii=False),
                now_utc(),
            ),
        )
    else:
        ev = json.loads(row["evidence"] or "[]")
        if evidence and evidence not in ev:
            ev.append(evidence)
        con.execute(
            """UPDATE candidates SET
                 name = CASE WHEN ? <> '' THEN ? ELSE name END,
                 ig_handle = COALESCE(?, ig_handle),
                 website = COALESCE(?, website),
                 lat = COALESCE(?, lat),
                 lon = COALESCE(?, lon),
                 gmaps_source_id = COALESCE(?, gmaps_source_id),
                 followers_hint = COALESCE(?, followers_hint),
                 evidence = ?
               WHERE id = ?""",
            (
                name,
                name,
                ig_handle,
                website,
                lat,
                lon,
                gmaps_source_id,
                followers_hint,
                json.dumps(ev, ensure_ascii=False),
                row["id"],
            ),
        )
    con.commit()
