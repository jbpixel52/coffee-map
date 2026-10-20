"""SQLite store + content archive. Archive-first: bytes hit disk before parsers."""
from __future__ import annotations

import gzip
import hashlib
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
    followers INTEGER,
    posts INTEGER,
    last_post_at TEXT,
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
"""


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
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
