from coffeemap.merge import haversine_m, norm_name, should_merge


def place(name, lat, lon, source="osm", sid="osm:node/1"):
    return {"name": name, "lat": lat, "lon": lon, "source": source, "source_id": sid}


def test_norm_name_folds_accents_case_and_punctuation():
    assert norm_name("Café Ñandú, S.A. COFFEE") == "cafe nandu s a coffee"


def test_same_name_same_spot_merges():
    a = place("Café del Norte", 32.5100, -117.0300)
    b = place("cafe del  norte", 32.5101, -117.0301, source="gmaps", sid="gmaps:ChIJx")
    assert should_merge(a, b)


def test_same_name_far_apart_does_not_merge():
    a = place("Starbucks", 32.5100, -117.0300)
    b = place("Starbucks", 32.5200, -117.0300, source="gmaps", sid="gmaps:ChIJy")
    assert not should_merge(a, b)  # ~1.1 km apart


def test_near_different_names_do_not_merge():
    a = place("Café Uno", 32.5100, -117.0300)
    b = place("Tacos El Paisa", 32.5101, -117.0301, source="gmaps", sid="gmaps:ChIJz")
    assert not should_merge(a, b)


def test_haversine_sanity():
    assert 900 < haversine_m(32.51, -117.03, 32.52, -117.03) < 1200


def test_rebuild_is_idempotent(tmp_path):
    from coffeemap.merge import rebuild_shops
    from coffeemap.store import connect, upsert_place

    con = connect(tmp_path / "t.db")
    upsert_place(con, source="osm", source_id="osm:node/1", name="Café A", lat=32.5, lon=-117.0)
    upsert_place(con, source="gmaps", source_id="gmaps:ChIJa", name="Cafe A", lat=32.5001, lon=-117.0001)
    assert rebuild_shops(con) == (1, 1)
    assert rebuild_shops(con) == (1, 1)
