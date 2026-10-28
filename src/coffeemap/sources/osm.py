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
                timeout=240,
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
    """'@Foo', 'https://instagram.com/foo/', 'instagram.com/foo?hl=x' -> 'foo'."""
    text = (text or "").strip().lstrip("@")
    if "instagram.com/" in text:
        text = text.split("instagram.com/", 1)[1]
    return text.strip("/").split("?")[0].split("#")[0]
