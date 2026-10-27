#!/usr/bin/env python3
"""Render research/city-stats-dossier.md from research/city-stats-facts.json.

The subagent that built the facts file was cut off before it wrote the narrative
dossier it promised. This renders that dossier deterministically from its own data —
no new claims, no new numbers — so the file it references (`research/city-stats-dossier.md`
appears in its own `_meta.caveat`) actually exists.

    python3 research/render_dossier.py
"""
from __future__ import annotations

import json
import pathlib

HERE = pathlib.Path(__file__).parent
facts = json.loads((HERE / "city-stats-facts.json").read_text())
meta, cities = facts["_meta"], facts["cities"]

OUT = HERE / "city-stats-dossier.md"


def fmt(n, dec=0):
    if n is None:
        return "—"
    return f"{n:,.{dec}f}"


def pct(n):
    return "—" if n is None else f"{n}%"


lines = [
    "# City stats dossier",
    "",
    "Authoritative population, area and published shop counts for the eleven cities on the",
    "map, with the definition behind each number. Facts file: `city-stats-facts.json`.",
    "",
    f"Generated {meta['generated']}. {meta['units']}.",
    "",
    "> " + meta["caveat"],
    "",
    "## What changed against the shipped config",
    "",
    "The app currently carries a single 2020 figure per city. This table is what the",
    "research found instead: US cities have newer annual estimates, and the Mexican",
    "municipios have a *localidad* (city proper) that is the fairer comparison for a",
    "US city boundary.",
    "",
    "| City | Population (year) | City proper (*localidad*) | Area km² | Published shops | This map | Coverage |",
    "|---|---|---|---|---|---|---|",
]

for c in sorted(cities, key=lambda c: -c["ours"]):
    pop = f"{fmt(c['population'])} ({c['population_year']})"
    loc = fmt(c["localidad"]) if c.get("localidad") else "—"
    lines.append(
        f"| {c['name']} | {pop} | {loc} | {fmt(c['area_km2'], 1)} | "
        f"{fmt(c.get('shops_published'))} | {fmt(c['ours'])} | {pct(c.get('our_count_vs_published_pct'))} |"
    )

lines += [
    "",
    "**Coverage** is this map's count as a share of the published count. It is not a quality",
    "score: the published figures come from directories whose category is wider than",
    "'coffee shop' (Tijuana's, for example, includes soda fountains and ice-cream parlours),",
    "so a low share can mean a narrower definition on our side *or* a broader one on theirs.",
    "",
    "## Per city",
    "",
]

for c in sorted(cities, key=lambda c: c["name"]):
    lines += [
        f"### {c['name']} ({c['country']})",
        "",
        f"- **Population** {fmt(c['population'])} — {c['population_definition']}",
    ]
    if c.get("localidad"):
        per100k = c.get("cafes_per_100k_using_city_proper")
        lines.append(
            f"- **City proper** {fmt(c['localidad'])} — per-capita on that base: {fmt(per100k, 1)} cafés/100k "
            f"(on the wider boundary: {fmt(c['our_cafes_per_100k'], 1)})"
        )
    if c.get("metro"):
        lines.append(f"- **Metro** {fmt(c['metro'])} ({c['metro_year']}) — {c.get('metro_source', '')}")
    lines += [
        f"- **Area** {fmt(c['area_km2'], 1)} km² — {c['area_definition']}",
        f"- **Published shop count** {fmt(c.get('shops_published'))} — {c.get('shops_source', 'no source recorded')}",
        f"- **This map** {fmt(c['ours'])} shops · {fmt(c['our_cafes_per_km2'], 2)}/km² · "
        f"{fmt(c['our_cafes_per_100k'], 1)}/100k residents · population density {fmt(c['our_pop_density_per_km2'], 0)}/km²",
    ]
    if c.get("notes"):
        lines += ["", f"**Why it matters.** {c['notes']}"]
    lines.append("")

lines += [
    "## How to read this",
    "",
    "- Per-capita is only as good as the boundary behind the population. A municipio is",
    "  not a city proper, and comparing one to a US city boundary understates Mexican",
    "  density. Where `localidad` exists, prefer it for per-capita figures and say which",
    "  base is in use.",
    "- Populations of different vintages should never share a single caption year. If these",
    "  numbers are adopted, the UI caption has to become year-aware per city.",
    "- Published counts are context, not a target. They are useful for one question only:",
    "  'is our number in a plausible range?' — 25% coverage of a broad directory and 96% of",
    "  a narrow one can describe equally complete censuses.",
    "",
    "## Provenance",
    "",
    "Compiled by a delegated research pass (2026-10-26) that was interrupted before it wrote",
    "this narrative; the facts file was already complete. This document is rendered from it",
    "verbatim, so every number here is the one that pass recorded, with its own source line.",
    "",
]

OUT.write_text("\n".join(lines))
print(f"wrote {OUT} ({len(lines)} lines)")
