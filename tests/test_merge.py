from coffeemap.merge import (
    haversine_m,
    name_match,
    norm_name,
    should_merge,
    token_covered,
)


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


def test_rebuild_excludes_not_cafe_places(tmp_path):
    from coffeemap.merge import rebuild_shops
    from coffeemap.store import connect, upsert_place

    con = connect(tmp_path / "t.db")
    upsert_place(con, source="gmaps", source_id="gmaps:ChIJn", name="Smart Fit", lat=32.5, lon=-117.0)
    con.execute("UPDATE places SET verdict='not_cafe'")
    con.commit()
    assert rebuild_shops(con) == (0, 0)


def test_token_covered_brand_vs_handle():
    assert token_covered("Brewja", "brewja.barradecafe")
    assert token_covered("Lumi", "LUMI CAFÉ")
    assert token_covered("Quimérico", "Quimérico | Cafetería y Restaurante")


def test_token_covered_rejects_generic_or_short_only():
    assert not token_covered("Cafe", "Cafe Zona Rio")  # only stop-tokens
    assert not token_covered("Ab", "Ab Cafe")  # 2-char distinctive token


def test_token_covered_reordered_fused_handle():
    assert token_covered("Mujer Divina Brunch Cafe", "brunchmujerdivina")
    assert token_covered("Blue Luna Cafe", "bluelunamx")
    assert not token_covered("Café de la Flor", "florderquis")  # 'flor' alone is not enough


def test_token_covered_typo_and_boundary_guards():
    # one-typo fused name still matches
    assert token_covered("VÓRTICE COFFEE HOUSE", "vortexcoffeehouse")
    assert token_covered("Lumi Café", "lumicafemx_")
    # fused substrings across token boundaries or lone generic words do not
    assert not token_covered("Barro Café", "Lux Coffee Bar & Roasters")
    assert not token_covered("CAFE MUNDO", "silvestre.mundo")


def test_name_match_rejects_shared_suffix_lookalikes():
    assert not name_match("Punto Coffee Community", "NATIVO COFFEE COMMUNITY")
    assert not name_match("AUM COFFEE COMMUNITY", "NATIVO COFFEE COMMUNITY")
    assert not name_match("CRU coffee roasters", "Electric Coffee Roasters")
    assert not name_match("Materia Café", "miatierracafe")
    assert name_match("Munchies Ice Cream & Coffee Shop", "munchiesicecream")


def test_name_match_folds_and_covers():
    assert name_match("CRU Coffee Roasters & Cellars", "crucoffee")
    assert name_match("Café de la Flor", "Cafe de la Flor - Plaza Río")
    assert not name_match("Café de la Flor", "padam.bistro")


def _feat(name, city, lat, lon, address):
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {"name": name, "city": city, "address": address},
    }


def test_cross_city_duplicates_keep_the_city_that_owns_the_postcode():
    from coffeemap.merge import drop_cross_city_duplicates

    feats = [
        # a Tijuana scrape that reached across the border: same café, two claims
        _feat("Caffe Tazza", "San Diego", 32.6398, -117.0496, "374 East H Street, Chula Vista, 91910"),
        _feat("Caffe Tazza", "Tijuana", 32.6398, -117.0496, "374 East H Street, Chula Vista, 91910"),
        # genuine locals on both sides, each with its own postcode
        _feat("Café Central", "Tijuana", 32.5310, -117.0360, "Av. Revolución 123, Tijuana, 22000"),
        _feat("Café Central", "San Diego", 32.7150, -117.1600, "700 Kettner Boulevard, San Diego, 92101"),
    ]
    kept = drop_cross_city_duplicates(feats)
    pairs = {(f["properties"]["city"], f["properties"]["name"]) for f in kept}
    assert pairs == {
        ("San Diego", "Caffe Tazza"),
        ("Tijuana", "Café Central"),
        ("San Diego", "Café Central"),
    }


def test_cross_city_duplicates_leave_ambiguous_groups_alone():
    from coffeemap.merge import drop_cross_city_duplicates

    # neither address helps (no postcode): do not guess which city owns it
    feats = [
        _feat("La Esquina", "Tijuana", 32.53, -117.04, ""),
        _feat("La Esquina", "San Diego", 32.53, -117.04, ""),
    ]
    assert len(drop_cross_city_duplicates(feats)) == 2
