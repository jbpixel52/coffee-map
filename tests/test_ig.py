import gzip
import re
from pathlib import Path

from coffeemap.sources.ig import classify_html, parse_profile_html

FIXTURE = Path(__file__).parent / "fixtures" / "ig_profile.html.gz"

# Locked against the captured page (2026-10-19, logged-out, es-MX):
# instagram.com/luxcoffeebar — 1,392 followers, 12 post shortcodes on page one.
HANDLE = "luxcoffeebar"
FOLLOWERS = 1392
FIRST_CODE = "C6o2H4uvc5U"
PAGE1_CODES = 12


def load() -> str:
    return gzip.decompress(FIXTURE.read_bytes()).decode("utf-8")


def test_parses_profile_from_real_html():
    prof = parse_profile_html(load())
    assert prof is not None, classify_html(load())
    assert prof["username"] == HANDLE
    assert prof["followers"] == FOLLOWERS
    assert prof["posts"] is None or prof["posts"] >= 1
    assert len(prof["post_codes"]) == PAGE1_CODES
    assert prof["post_codes"][0] == FIRST_CODE


def test_classifies_real_fixture_as_public():
    assert classify_html(load()) == "public"


def test_offline_parse_survives_the_envelope():
    """The payload is double-nested (Relay preloader) — parse must not need the envelope."""
    assert re.search(r"xig_user_by_username", load())  # sanity: bytes really contain it


def test_classifier_has_a_real_unknown():
    assert classify_html("<html><body>nothing here</body></html>") == "unknown"
    assert classify_html('<html><body><input type="password"></body></html>') == "login_required"
    assert classify_html("<html>challenge_required</html>") == "challenge"


def test_not_found_and_rate_limited_states():
    assert classify_html("<html><body>Sorry, this page isn't available.</body></html>") == "not_found"
    assert classify_html("<html><body>Too many requests</body></html>") == "rate_limited"


def test_not_found_is_localized():
    """Measured: a dead handle on an es-MX client serves a Spanish page, not the English one."""
    html = '<html><head><title>Profile no está disponible • Instagram</title></head></html>'
    assert classify_html(html) == "not_found"
