"""OpenStreetMap / Overpass source: fetch, archive, parse."""
from __future__ import annotations

import json

import httpx

from ..config import City

MIRRORS = [
    # maps.mail.ru answers fast with current planet data; overpass-api.de bans
    # bursty IPs, so a working primary that is not api.de is load-bearing.
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
UA = "coffee-map/0.1 (github.com/jbpixel52/coffee-map)"
# Per-mirror timeout. Four mirrors at 240 s each meant a single bad Overpass day could burn
# sixteen minutes before the first retry; 150 s still covers a slow-but-working query on a
# big bbox (Los Angeles takes minutes) while failing a dead mirror quickly.
MIRROR_TIMEOUT = 150


def build_query(city: City) -> str:
    s, w, n, e = city.bbox
    bbox = f"({s},{w},{n},{e})"
    return (
        "[out:json][timeout:180];("
        f'nwr["amenity"="cafe"]{bbox};'
        # Matcha-first places count as cafés on this map: they serve coffee too.
        # shop=tea alone is NOT included — boba and tea houses are a different census —
        # but a matcha-branded one is a café in every city's local understanding.
        f'nwr["shop"="tea"]["name"~"matcha",i]{bbox};'
        f'nwr["cuisine"~"matcha",i]{bbox};'
        # A place whose cuisine IS "coffee_shop" is a café whatever its amenity tag says:
        # Mexico City alone has 187 of them north of the centre that never carried
        # amenity=cafe, and they are invisible to a query that only asks for that tag.
        f'nwr["cuisine"~"coffee_shop",i]{bbox};'
        ");out center tags;"
    )


def fetch(city: City) -> bytes:
    """Fetch raw Overpass JSON bytes. The caller archives them."""
    query = build_query(city)
    last_err: Exception | None = None
    for url in MIRRORS:
        try:
            r = httpx.post(
                url,
                data={"data": query},
                headers={"User-Agent": UA, "Accept": "application/json"},
                timeout=MIRROR_TIMEOUT,
            )
            r.raise_for_status()
            return r.content
        except Exception as exc:  # noqa: BLE001 — try the next mirror
            last_err = exc
    raise RuntimeError(f"all Overpass mirrors failed: {last_err}")


def format_address(tags: dict, city_fallback: str | None = None) -> str | None:
    """addr:* tags -> "Av. Revolución 123, Tijuana, 22000" (tolerant of gaps).

    Every shop already belongs to a city, so fall back to it when the place has
    no addr:city — otherwise the card reads "604 Brazos Street, 78701".
    """
    street = (tags.get("addr:street") or "").strip()
    number = (tags.get("addr:housenumber") or "").strip()
    city = (tags.get("addr:city") or city_fallback or "").strip()
    postcode = (tags.get("addr:postcode") or "").strip()
    line = " ".join(part for part in (number, street) if part)
    if not line:  # a lone postcode or city is not a street address
        return None
    parts = [part for part in (line, city, postcode) if part]
    return ", ".join(parts)


def parse_elements(raw: bytes, city_name: str | None = None) -> list[dict]:
    """Overpass JSON -> [{source_id, name, lat, lon, website, instagram, address}, ...]."""
    doc = json.loads(raw)
    out: list[dict] = []
    for el in doc.get("elements", []):
        tags = el.get("tags", {})
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None and "center" in el:  # ways/relations carry a center
            lat, lon = el["center"]["lat"], el["center"]["lon"]
        if lat is None or lon is None:
            continue
        website = (tags.get("website") or tags.get("contact:website") or "").strip()
        instagram = norm_instagram(tags.get("contact:instagram") or tags.get("instagram", ""))
        if not instagram and "instagram.com" in website:
            instagram, website = norm_instagram(website), ""
        out.append({
            "source_id": f"osm:{el['type']}/{el['id']}",
            "name": (tags.get("name") or "").strip(),
            "lat": float(lat),
            "lon": float(lon),
            "website": website or None,
            "instagram": instagram or None,
            "address": format_address(tags, city_name),
        })
    return out


def norm_instagram(text: str) -> str:
    """'@Foo', 'https://instagram.com/foo/', 'instagram.com/foo?hl=x' -> 'foo'.

    Mirrors and archives hand over more than handles: a full imginn.com URL, a trailing
    slash, or a link to a post rather than a profile. A post code is not a handle, so it
    is dropped rather than shipped as a button that opens the wrong thing.
    """
    text = (text or "").strip().lstrip("@")
    for host in ("instagram.com/", "imginn.com/", "picuki.com/profile/", "www.instagram.com/"):
        if host in text:
            text = text.split(host, 1)[1]
    text = text.strip("/").split("?")[0].split("#")[0].strip("/")
    if text.startswith(("p/", "reel/", "reels/", "tv/", "stories/")):
        return ""
    return text if all(ch.isalnum() or ch in "._" for ch in text) else ""
