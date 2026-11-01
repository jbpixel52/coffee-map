"""The junction between discovery and attachment.

`ig-attach` used to walk only `ig_profiles`, so a handle found by web-search and judged a
café by the classifier was invisible to it: the candidate sat with verdict='cafe' forever,
because `ig-recon` reads `ig_profiles` too. Every café found by the search tier was lost at
that seam. These tests pin the seam shut, end to end through the real CLI.
"""
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

from coffeemap import store

ROOT = Path(__file__).resolve().parents[1]


def _env(tmp_path: Path) -> dict:
    return {
        **os.environ,
        "COFFEEMAP_DB": str(tmp_path / "t.db"),
        "COFFEEMAP_ARCHIVE": str(tmp_path / "archive"),
        "COFFEEMAP_CITY": str(ROOT / "config" / "city.toml"),
        "PYTHONPATH": str(ROOT / "src"),
    }


def _attach(env: dict) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "coffeemap.cli", "ig-attach"],
        env=env, cwd=ROOT, capture_output=True, text=True, timeout=120,
    )


def test_a_cafe_candidate_attaches_without_a_profile_row(tmp_path: Path):
    con = store.connect(tmp_path / "t.db")
    store.upsert_place(con, source="gmaps", source_id="g:1", name="Cachos Café",
                       lat=32.52, lon=-117.03)
    con.execute(
        "INSERT INTO candidates (kind, key, name, verdict, created_at) "
        "VALUES ('ig', '@thecachoscafe', 'Cachos Café', 'cafe', '2026-10-31T00:00:00Z')"
    )
    con.commit()
    con.close()

    out = _attach(_env(tmp_path))
    assert out.returncode == 0, out.stderr
    con = sqlite3.connect(tmp_path / "t.db")
    got = con.execute("SELECT instagram FROM places WHERE name='Cachos Café'").fetchone()[0]
    assert got == "thecachoscafe"


def test_a_rejected_candidate_never_attaches(tmp_path: Path):
    """The gate still bites: discovery must not become a way around classification."""
    con = store.connect(tmp_path / "t.db")
    store.upsert_place(con, source="gmaps", source_id="g:2", name="Montenegro Café",
                       lat=32.52, lon=-117.03)
    con.execute(
        "INSERT INTO candidates (kind, key, name, verdict, created_at) "
        "VALUES ('ig', '@montenegro.cafe', 'Montenegro Café', 'not_cafe', '2026-10-31T00:00:00Z')"
    )
    con.commit()
    con.close()

    out = _attach(_env(tmp_path))
    assert out.returncode == 0, out.stderr
    con = sqlite3.connect(tmp_path / "t.db")
    got = con.execute("SELECT instagram FROM places WHERE name='Montenegro Café'").fetchone()[0]
    assert not got
