import { describe, expect, it } from "vitest";
import { PALETTE, SPRITE_IDS, watercolorStyle } from "./watercolor";

const layers = watercolorStyle.layers as any[];
const sources = Object.keys(watercolorStyle.sources as Record<string, unknown>);

describe("watercolor style", () => {
  it("is a valid v8 style with glyphs and sprite", () => {
    expect(watercolorStyle.version).toBe(8);
    expect(watercolorStyle.glyphs).toContain("{fontstack}/{range}.pbf");
    expect(watercolorStyle.sprite).toMatch(/styles\/sprite$/);
    // MapLibre feeds the sprite URL to `new URL()`: a relative path throws
    // there and the sprite silently never loads (learned the hard way).
    expect(() => new URL(watercolorStyle.sprite as string)).not.toThrow();
  });

  it("has unique layer ids and every source reference resolves", () => {
    const ids = layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of layers) {
      if (l.source) expect(sources, `${l.id} -> ${l.source}`).toContain(l.source);
      if (l.type !== "background") expect(l["source-layer"], l.id).toBeTruthy();
    }
  });

  it("draws the base from paper and water from a wash", () => {
    expect(layers[0]).toMatchObject({ id: "background", paint: { "background-color": PALETTE.paper } });
    const water = layers.find((l) => l.id === "water");
    expect(water.paint["fill-color"]).toBe(PALETTE.water);
    expect(layers.find((l) => l.id === "water-bleed").paint["line-blur"]).toBeGreaterThan(0);
    // pooled blotches ride above the plain fill (color+pattern can't share a layer)
    expect(layers.find((l) => l.id === "water-wash").paint["fill-pattern"]).toBe("wash");
  });

  it("lays paper grain over the washes but under the labels", () => {
    const grain = layers.findIndex((l) => l.id === "paper-grain");
    expect(grain).toBeGreaterThan(0);
    expect(layers[grain].paint["background-pattern"]).toBe("paper");
    expect(layers[grain].paint["background-opacity"]).toBeLessThan(1);
    const firstLabel = layers.findIndex((l) => l.type === "symbol");
    expect(grain).toBeLessThan(firstLabel);
  });

  it("paints buildings as a wash under a mottle speckle", () => {
    const wash = layers.find((l) => l.id === "building");
    const mottle = layers.find((l) => l.id === "building-mottle");
    expect(wash.paint["fill-color"]).toBe(PALETTE.building);
    expect(wash.paint["fill-pattern"]).toBeUndefined();
    expect(mottle.paint["fill-pattern"]).toBe("mottle");
    expect(mottle.paint["fill-color"]).toBeUndefined();
  });

  it("only references sprite images that the generated sprite ships", () => {
    for (const l of layers) {
      for (const key of ["background-pattern", "fill-pattern"]) {
        const v = l.paint?.[key];
        if (v) expect(SPRITE_IDS as readonly string[]).toContain(v);
      }
    }
  });

  it("gives every label ink and a paper halo (no invisible labels)", () => {
    for (const l of layers.filter((l) => l.type === "symbol")) {
      expect(l.paint["text-color"], l.id).toBeTruthy();
      expect(l.paint["text-halo-color"], l.id).toBe(PALETTE.paper);
      expect(l.layout["text-font"]?.length, l.id).toBeGreaterThan(0);
    }
  });

  it("keeps roads legible: white core over a casing over a blurred shade", () => {
    const shade = layers.find((l) => l.id === "road-shade");
    const casing = layers.find((l) => l.id === "road-casing");
    const major = layers.find((l) => l.id === "road-major");
    expect(shade.paint["line-blur"]).toBeGreaterThan(0);
    expect(casing.paint["line-color"]).toBe(PALETTE.roadCasing);
    expect(major.paint["line-color"]).toBe(PALETTE.road);
    // order matters: shade, then casing, then the white core
    const order = ["road-shade", "road-casing", "road-major"].map((id) => layers.findIndex((l) => l.id === id));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
