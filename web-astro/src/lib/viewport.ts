/** Which city is on screen: count shop points inside the current bounds. */
import type { Feature, Point } from "geojson";
import type { ShopProps } from "./filter";

export interface ViewBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Count features per city inside a viewport; ignores shops with no city. */
export function cityCountsInView(
  features: readonly Feature<Point>[],
  bounds: ViewBounds,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of features) {
    const p = f.properties as Partial<ShopProps> | null;
    const city = p?.city;
    if (!city) continue;
    const [lon, lat] = f.geometry.coordinates;
    const inLon =
      bounds.west <= bounds.east
        ? lon >= bounds.west && lon <= bounds.east
        : lon >= bounds.west || lon <= bounds.east; // antimeridian
    if (!inLon || lat < bounds.south || lat > bounds.north) continue;
    counts[city] = (counts[city] ?? 0) + 1;
  }
  return counts;
}

/** The city with the most shops in view; alphabetical breaks a tie. */
export function cityInView(
  features: readonly Feature<Point>[],
  bounds: ViewBounds,
): string | null {
  const counts = cityCountsInView(features, bounds);
  let winner: string | null = null;
  let top = 0;
  for (const city of Object.keys(counts).sort()) {
    if (counts[city] > top) {
      top = counts[city];
      winner = city;
    }
  }
  return winner;
}
