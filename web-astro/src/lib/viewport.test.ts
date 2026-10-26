import { describe, expect, it } from "vitest";
import type { Feature, Point } from "geojson";
import { cityCountsInView, cityInView } from "./viewport";

function shop(lon: number, lat: number, city?: string): Feature<Point> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: city ? { city } : {},
  };
}

const bounds = { west: -118, south: 32, east: -117, north: 33 };

describe("cityInView", () => {
  it("picks the city with the most features inside the bounds", () => {
    const features = [
      shop(-117.5, 32.5, "San Diego"),
      shop(-117.4, 32.6, "Tijuana"),
      shop(-117.3, 32.7, "Tijuana"),
      shop(-116.9, 32.8, "San Diego"),
    ];
    expect(cityCountsInView(features, bounds)).toEqual({ Tijuana: 2, "San Diego": 1 });
    expect(cityInView(features, bounds)).toBe("Tijuana");
  });

  it("ignores shops outside the viewport and shops with no city", () => {
    const features = [shop(-117.5, 32.5, "Tijuana"), shop(-100, 20, "Mexico City"), shop(-117.5, 32.5)];
    expect(cityCountsInView(features, bounds)).toEqual({ Tijuana: 1 });
  });

  it("breaks a tie alphabetically and returns null for an empty view", () => {
    const features = [shop(-117.5, 32.5, "Tijuana"), shop(-117.4, 32.6, "Ensenada")];
    expect(cityInView(features, bounds)).toBe("Ensenada");
    expect(cityInView([], bounds)).toBeNull();
  });

  it("handles a viewport that crosses the antimeridian", () => {
    const wrap = { west: 170, south: -10, east: -170, north: 10 };
    expect(cityCountsInView([shop(179, 0, "Fiji"), shop(-179, 0, "Fiji")], wrap)).toEqual({ Fiji: 2 });
  });
});
