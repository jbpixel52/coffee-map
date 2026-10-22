import { describe, expect, it } from "vitest";
import type { Feature, FeatureCollection, Point } from "geojson";
import { ZONE_SIZE, buildZones } from "./zones";

function pt(lon: number, lat: number, followers?: number): Feature<Point> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: followers == null ? {} : { ig_followers: followers },
  };
}

describe("buildZones", () => {
  it("clusters nearby shops into one zone centroid with summed followers", () => {
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [pt(-117.0, 32.5, 100), pt(-117.001, 32.501, 50)],
    };
    const zones = buildZones(fc);
    expect(zones.features).toHaveLength(1);
    const z = zones.features[0];
    expect(z.properties?.zone_followers).toBe(150);
    expect(z.properties?.zone_shops).toBe(2);
    const [lon, lat] = z.geometry.coordinates;
    expect(lon).toBeCloseTo(-117.0005, 4);
    expect(lat).toBeCloseTo(32.5005, 4);
  });

  it("keeps distant shops in separate zones", () => {
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [pt(-117.0, 32.5, 10), pt(-117.2, 32.6, 20)],
    };
    expect(buildZones(fc).features).toHaveLength(2);
  });

  it("treats missing followers as 0 and skips non-point features", () => {
    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [
        pt(-117.0, 32.5),
        { type: "Feature", geometry: null as unknown as Point, properties: {} },
      ],
    };
    const zones = buildZones(fc);
    expect(zones.features).toHaveLength(1);
    expect(zones.features[0].properties?.zone_followers).toBe(0);
  });

  it("zone size constant is ~2km (0.018 degrees)", () => {
    expect(ZONE_SIZE).toBeCloseTo(0.018, 3);
  });
});
