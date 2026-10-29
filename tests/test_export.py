import json

from coffeemap.config import City
from coffeemap.export import export
from coffeemap.merge import rebuild_shops
from coffeemap.store import connect, upsert_place

CITY = City("Testville", "MX", "es-MX", "America/Tijuana", 32.5, -117.0, 12.0,
            (32.4, -117.1, 32.6, -116.9), [])


def test_export_shape(tmp_path, monkeypatch):
    monkeypatch.setattr("coffeemap.export.OUT_DIR", tmp_path / "data")
    con = connect(tmp_path / "t.db")
    upsert_place(con, source="osm", source_id="osm:node/1", name="Café A",
                 lat=32.5, lon=-117.0, instagram="cafea")
    upsert_place(con, source="osm", source_id="osm:node/2", name="", lat=32.51, lon=-117.01)
    rebuild_shops(con)
    meta = export(con, CITY)
    fc = json.loads((tmp_path / "data" / "shops.geojson").read_text())
    assert meta["shop_count"] == 1 and meta["unnamed_excluded"] == 1
    assert fc["features"][0]["properties"]["name"] == "Café A"
    assert fc["features"][0]["geometry"]["coordinates"] == [-117.0, 32.5]
    assert fc["features"][0]["properties"]["instagram"] == "cafea"


def test_export_reads_ig_profiles(tmp_path, monkeypatch):
    monkeypatch.setattr("coffeemap.export.OUT_DIR", tmp_path / "data")
    con = connect(tmp_path / "t.db")
    upsert_place(con, source="osm", source_id="osm:node/1", name="Café A",
                 lat=32.5, lon=-117.0, instagram="cafea")
    con.execute(
        "INSERT INTO ig_profiles (handle, followers, posts, last_post_at, capture_state,"
        " fetched_at, archive_ref) VALUES ('cafea', 1200, 40, '2026-10-01', 'public',"
        " '2026-10-19T00:00:00Z', 'x')"
    )
    rebuild_shops(con)
    meta = export(con, CITY)
    fc = json.loads((tmp_path / "data" / "shops.geojson").read_text())
    assert meta["with_instagram"] == 1
    assert fc["features"][0]["properties"]["ig_followers"] == 1200


def test_dead_instagram_handles_are_withheld(tmp_path, monkeypatch):
    """A handle Instagram serves as not_found must not ship as a broken link."""
    monkeypatch.setattr("coffeemap.export.OUT_DIR", tmp_path / "data")
    con = connect(tmp_path / "t.db")
    for handle, state, followers in (("livecafe", "public", 1234), ("deadcafe", "not_found", None)):
        upsert_place(con, source="osm", source_id=f"osm:node/{handle}", name=f"Café {handle}",
                     lat=32.5, lon=-117.0, instagram=handle)
        con.execute(
            "INSERT INTO ig_profiles (handle, capture_state, followers, fetched_at) VALUES (?,?,?,datetime('now'))",
            (handle, state, followers),
        )
    con.commit()
    rebuild_shops(con)
    export(con, CITY)

    fc = json.loads((tmp_path / "data" / "shops.geojson").read_text())
    props = {f["properties"]["name"]: f["properties"] for f in fc["features"]}
    assert props["Café livecafe"]["instagram"] == "livecafe"
    assert props["Café livecafe"]["ig_followers"] == 1234
    assert props["Café deadcafe"]["instagram"] is None
    assert props["Café deadcafe"]["ig_followers"] is None
