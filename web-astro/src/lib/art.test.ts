import { describe, expect, it } from "vitest";
import {
  bboxFromCircle,
  imageCoordinates,
  M_PER_DEG_LAT,
  parseArtMeta,
} from "./art";

describe("bboxFromCircle", () => {
  it("expands a radius into a symmetric lat/lon box", () => {
    const b = bboxFromCircle(32.5149, -117.0382, 1500);
    const dLat = 1500 / M_PER_DEG_LAT;
    expect(b.north - b.south).toBeCloseTo(dLat * 2, 10);
    expect((b.north + b.south) / 2).toBeCloseTo(32.5149, 10);
    expect((b.east + b.west) / 2).toBeCloseTo(-117.0382, 10);
  });

  it("widens longitude span at higher latitude", () => {
    const tj = bboxFromCircle(32.5149, -117.0382, 1500);
    const eq = bboxFromCircle(0, -117.0382, 1500);
    expect(tj.east - tj.west).toBeGreaterThan(eq.east - eq.west);
  });

  it("survives a pole without division by zero", () => {
    const b = bboxFromCircle(90, 0, 1000);
    expect(Number.isFinite(b.east - b.west)).toBe(true);
  });
});

describe("imageCoordinates", () => {
  it("orders corners TL, TR, BR, BL", () => {
    const b = { west: -1, south: 0, east: 1, north: 2 };
    expect(imageCoordinates(b)).toEqual([
      [-1, 2],
      [1, 2],
      [1, 0],
      [-1, 0],
    ]);
  });
});

describe("parseArtMeta", () => {
  const good = { image: "hero.png", center: [32.5, -117.0], radius_m: 1500 };

  it("accepts a valid meta", () => {
    expect(parseArtMeta(good)).toMatchObject({ image: "hero.png", radius_m: 1500 });
  });

  it("rejects junk", () => {
    expect(parseArtMeta(null)).toBeNull();
    expect(parseArtMeta({})).toBeNull();
    expect(parseArtMeta({ ...good, radius_m: 0 })).toBeNull();
    expect(parseArtMeta({ ...good, center: [NaN, 1] })).toBeNull();
    expect(parseArtMeta({ ...good, center: [1] })).toBeNull();
    expect(parseArtMeta({ ...good, image: "" })).toBeNull();
  });

  it("ignores provenance fields it does not need", () => {
    const meta = parseArtMeta({ ...good, px: [1650, 1650], circle: true, source: "OSM" });
    expect(meta).toEqual({ image: "hero.png", center: [32.5, -117.0], radius_m: 1500 });
  });
});
