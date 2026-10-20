"""Unit tests for the local-model classifier's reply parser (offline)."""
from __future__ import annotations

from coffeemap.classify import parse_verdict


def test_plain_answers():
    assert parse_verdict("CAFE") == "cafe"
    assert parse_verdict("NOT_CAFE") == "not_cafe"


def test_accents_and_case():
    assert parse_verdict("café") == "cafe"
    assert parse_verdict("  Café. ") == "cafe"


def test_spanish_negatives():
    assert parse_verdict("NO ES CAFE") == "not_cafe"
    assert parse_verdict("NO_CAFE") == "not_cafe"


def test_chatty_replies_still_parse():
    assert parse_verdict("This is a cafe.") == "cafe"
    assert parse_verdict("This is not a cafe.") == "not_cafe"


def test_garbage_is_none():
    assert parse_verdict("") is None
    assert parse_verdict("I can't tell") is None


def test_coffee_word_counts_as_cafe():
    assert parse_verdict("COFFEE") == "cafe"
