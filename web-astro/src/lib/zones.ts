/** Per-zone clustering: grid-bucket shops and aggregate follower counts so the
 * heat view can show cold→hot zone circles, not just raw point density. */
import type { Feature, FeatureCollection, Point } from "geojson";

/** ~2 km at Tijuana's latitude. */
export const ZONE_SIZE = 0.018;

export interface ZoneProps {
  zone_followers: number;
  zone_shops: number;
}

export function buildZones(fc: FeatureCollection<Point>): FeatureCollection<Point> {
  const buckets = new Map<string, { lon: number; lat: number; followers: number; count: number }>();
  for (const f of fc.features) {
    if (!f.geometry || f.geometry.type !== "Point") continue;
    const [lon, lat] = f.geometry.coordinates;
    const key = `${Math.floor(lon / ZONE_SIZE)},${Math.floor(lat / ZONE_SIZE)}`;
    const b = buckets.get(key) ?? { lon: 0, lat: 0, followers: 0, count: 0 };
    b.lon += lon;
    b.lat += lat;
    b.followers += (f.properties as { ig_followers?: number } | null)?.ig_followers ?? 0;
    b.count += 1;
    buckets.set(key, b);
  }
  const features: Feature<Point>[] = [];
  for (const b of buckets.values()) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.lon / b.count, b.lat / b.count] },
      properties: { zone_followers: b.followers, zone_shops: b.count } satisfies ZoneProps,
    });
  }
  return { type: "FeatureCollection", features };
}
