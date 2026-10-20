"""OpenStreetMap / Overpass source: fetch, archive, parse."""
from __future__ import annotations

import json

import httpx

from ..config import City

MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
UA = "coffee-map/0.1 (github.com/jbpixel52/coffee-map)"


def build_query(city: City) -> str:
    s, w, n, e = city.bbox
    return (
        "[out:json][timeout:180];"
        f'nwr["amenity"="cafe"]({s},{w},{n},{e});'
        "out center tags;"
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


def parse_elements(raw: bytes) -> list[dict]:
    """Overpass JSON -> [{source_id, name, lat, lon, website, instagram}, ...]."""
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
        })
    return out


def norm_instagram(text: str) -> str:
    """'@Foo', 'https://instagram.com/foo/', 'instagram.com/foo?hl=x' -> 'foo'."""
    text = (text or "").strip().lstrip("@")
    if "instagram.com/" in text:
        text = text.split("instagram.com/", 1)[1]
    return text.strip("/").split("?")[0].split("#")[0]
