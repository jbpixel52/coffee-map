import { describe, expect, it } from "vitest";
import type { Feature, Point } from "geojson";
import { cityStats, meanNearestM, ordinal, rankBy, topBrand, zipOf } from "./stats";

const shop = (
  name: string,
  city: string,
  lat: number,
  lon: number,
  extra: Record<string, unknown> = {},
): Feature<Point> =>
  ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { name, city, instagram: null, ig_followers: null, address: null, ...extra },
  }) as Feature<Point>;

describe("zipOf", () => {
  it("reads a five-digit ZIP or Mexican CP out of an address", () => {
    expect(zipOf("714 Traction Avenue, Los Angeles, 90013")).toBe("90013");
    expect(zipOf("Calle 11 8290 Zona Centro 22000")).toBe("22000");
  });

  it("returns null for no address and ignores longer numbers", () => {
    expect(zipOf(null)).toBeNull();
    expect(zipOf("")).toBeNull();
    expect(zipOf("Av. Revolución 123456")).toBeNull();
  });
});

describe("meanNearestM", () => {
  it("returns null below two points", () => {
    expect(meanNearestM([])).toBeNull();
    expect(meanNearestM([[32.5, -117]])).toBeNull();
  });

  it("measures a known grid spacing", () => {
    // ~0.009° of latitude is ~1 km, so a row of four points ~1 km apart averages ~1 km
    const row: Array<[number, number]> = [
      [32.5, -117.0],
      [32.509, -117.0],
      [32.518, -117.0],
      [32.527, -117.0],
    ];
    const mean = meanNearestM(row);
    expect(mean).not.toBeNull();
    expect(mean!).toBeGreaterThan(900);
    expect(mean!).toBeLessThan(1200); // ends have one neighbour, the middle two have two
  });
});

describe("topBrand", () => {
  it("finds the repeated first word and ignores category words", () => {
    const names = [
      "Starbucks Reforma",
      "Starbucks Centro",
      "STARBUCKS Polanco",
      "Café de la Flor",
      "Café Central",
      "Cafetería Sol",
    ];
    const brand = topBrand(names, 6);
    expect(brand?.name.toLowerCase()).toBe("starbucks");
    expect(brand?.count).toBe(3);
  });

  it("returns null when nothing repeats enough", () => {
    expect(topBrand(["Uno", "Dos", "Tres", "Café X"], 4)).toBeNull();
  });
});

describe("cityStats", () => {
  const features = [
    shop("Alpha", "A", 32.5, -117.0, { instagram: "alpha", ig_followers: 100, address: "Calle 1, 22000" }),
    shop("Beta", "A", 32.51, -117.0, { instagram: "beta", ig_followers: 300, address: "Calle 2, 22000" }),
    shop("Gamma", "A", 32.52, -117.0, { address: "Calle 3, 22100" }),
    shop("Delta", "B", 32.7, -117.1, { address: null }),
  ];
  const cities = [
    { name: "A", shop_count: 3, with_instagram: 2, population: 200_000, area_sq_km: 25.9 },
    { name: "B", shop_count: 1, with_instagram: 0, population: 0, area_sq_km: 0 },
  ];

  it("counts, shares and densities per city", () => {
    const [a, b] = cityStats(features, cities);
    expect(a.shops).toBe(3);
    expect(a.sharePct).toBe(75);
    // 25.9 km² is ~10 sq mi, so 3 cafés is ~0.3 per sq mi
    expect(a.perSqMi).toBeCloseTo(0.3, 1);
    expect(a.per100k).toBe(3 / 2);
    expect(b.perSqMi).toBeNull(); // no area on record
    expect(b.per100k).toBeNull(); // no population on record
  });

  it("counts ZIPs, Instagram and addresses", () => {
    const [a] = cityStats(features, cities);
    expect(a.zipCount).toBe(2);
    expect(a.shopsPerZip).toBe(1.5);
    expect(a.topZip).toEqual({ zip: "22000", count: 2 });
    expect(a.igShops).toBe(2);
    expect(a.igPct).toBe(66.7);
    expect(a.followers).toBe(400);
    expect(a.medianFollowers).toBe(200);
    expect(a.topShop).toEqual({ name: "Beta", followers: 300 });
    expect(a.addressPct).toBe(100);
  });

  it("handles a city with no shops without dividing by zero", () => {
    const [c] = cityStats(features, [
      { name: "C", shop_count: 0, with_instagram: 0, population: 100, area_sq_km: 10 },
    ]);
    expect(c.shops).toBe(0);
    expect(c.igPct).toBe(0);
    expect(c.addressPct).toBe(0);
    expect(c.nearestM).toBeNull();
    expect(c.topShop).toBeNull();
  });
});

describe("rankBy", () => {
  const stats = cityStats(
    [shop("A1", "A", 32.5, -117), shop("B1", "B", 32.6, -117), shop("B2", "B", 32.61, -117)],
    [
      { name: "A", shop_count: 1, with_instagram: 0, population: 1, area_sq_km: 10 },
      { name: "B", shop_count: 2, with_instagram: 0, population: 1, area_sq_km: 10 },
    ],
  );

  it("ranks higher-is-better and lower-is-better, skipping missing values", () => {
    expect(rankBy(stats, (s) => s.shops)).toEqual(["B", "A"]);
    expect(rankBy(stats, (s) => s.perSqMi, true)).toEqual(["A", "B"]);
    expect(rankBy(stats, () => null)).toEqual([]);
  });
});

describe("ordinal", () => {
  it("handles the teens and the single digits", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
    ]);
  });
});
