from pathlib import Path

from coffeemap import store


def test_archive_roundtrip(tmp_path: Path):
    ref = store.archive_write("osm", "cafe-bbox", b'{"a":1}', "json", root=tmp_path)
    assert ref.endswith(".json.gz")
    assert store.archive_read(ref, root=tmp_path) == b'{"a":1}'
    assert store.archive_read(ref, root=tmp_path) == b'{"a":1}'  # idempotent re-read


def test_upsert_place_is_idempotent(tmp_path: Path):
    con = store.connect(tmp_path / "t.db")
    for _ in range(2):
        store.upsert_place(con, source="osm", source_id="osm:node/1", name="Café A",
                           lat=32.5, lon=-117.0, instagram="cafea")
    n = con.execute("SELECT COUNT(*) FROM places").fetchone()[0]
    assert n == 1
    row = con.execute("SELECT instagram FROM places").fetchone()
    assert row["instagram"] == "cafea"


def test_fetch_log_latest(tmp_path: Path):
    con = store.connect(tmp_path / "t.db")
    store.record_fetch(con, "osm", "cafe-bbox", "2026-10-19/osm.cafe-bbox.abc.json.gz")
    store.record_fetch(con, "osm", "cafe-bbox", "2026-10-19/osm.cafe-bbox.def.json.gz")
    assert store.latest_fetch(con, "osm").endswith(".def.json.gz")
