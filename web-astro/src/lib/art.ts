/** prettymaps art basemap: georeference a static prettymaps poster so MapLibre
 * can drape it over the watercolor style as a raster layer.
 *
 * `scripts/prettymaps_art.py` renders a square figure of `radius_m` around a
 * center (prettymaps' `circle=True` inscribes the disc, leaving cream corners
 * that blend with the paper background). That square maps 1:1 onto a
 * lon/lat bbox, which is all MapLibre's `image` source needs.
 */

export interface ArtMeta {
  /** Image file name, relative to `<base>art/`. */
  image: string;
  /** Poster center as [lat, lon]. */
  center: [number, number];
  /** Half-extent of the rendered square, in meters. */
  radius_m: number;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Meters per degree of latitude (WGS84 mean). */
export const M_PER_DEG_LAT = 111_320;

/** Axis-aligned bbox of a `radiusM` square centered on lat/lon. */
export function bboxFromCircle(lat: number, lon: number, radiusM: number): BBox {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLon = radiusM / (M_PER_DEG_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 1e-6));
  return { west: lon - dLon, south: lat - dLat, east: lon + dLon, north: lat + dLat };
}

/** MapLibre `image` source coordinates: TL, TR, BR, BL as [lng, lat]. */
export function imageCoordinates(
  b: BBox,
): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [b.west, b.north],
    [b.east, b.north],
    [b.east, b.south],
    [b.west, b.south],
  ];
}

/** Validate a decoded hero.json; null when it cannot be georeferenced. */
export function parseArtMeta(raw: unknown): ArtMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<ArtMeta>;
  const c = m.center;
  if (!m.image || typeof m.image !== "string") return null;
  if (!Array.isArray(c) || c.length !== 2) return null;
  const [lat, lon] = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!Number.isFinite(m.radius_m) || (m.radius_m as number) <= 0) return null;
  return {
    image: m.image,
    center: [lat, lon],
    radius_m: m.radius_m as number,
  };
}

/** Fetch and validate `<base>art/hero.json`; null when absent (art is optional). */
export async function loadArtMeta(baseUrl: string): Promise<ArtMeta | null> {
  try {
    const res = await fetch(`${baseUrl}art/hero.json`);
    if (!res.ok) return null;
    return parseArtMeta(await res.json());
  } catch {
    return null;
  }
}
