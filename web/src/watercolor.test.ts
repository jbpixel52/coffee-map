import { describe, expect, it } from "vitest";
import { PALETTE, PALETTE_DARK, SPRITE_IDS, watercolorStyle, darkenStyle, remapValue, applyMapTheme, TEXTURE_OPACITY, TEXTURE_OPACITY_DARK, type MapInstance } from "./watercolor";
import type { StyleSpecification } from "maplibre-gl";

const layers = watercolorStyle.layers as any[];
const sources = Object.keys(watercolorStyle.sources as Record<string, unknown>);

describe("watercolor style", () => {
  it("is a valid v8 style with glyphs and sprite", () => {
    expect(watercolorStyle.version).toBe(8);
    expect(watercolorStyle.glyphs).toContain("{fontstack}/{range}.pbf");
    expect(watercolorStyle.sprite).toMatch(/styles\/sprite$/);
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
    expect(layers.find((l) => l.id === "water-wash").paint["fill-pattern"]).toBe("bloom");
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
    expect(wash.paint["fill-pattern"]).toBeUndefined();
    expect(mottle.paint["fill-pattern"]).toBe("mottle");
    expect(mottle.paint["fill-color"]).toBeUndefined();
  });
  it("varies building tints per feature id (painted blocks)", () => {
    const wash = layers.find((l) => l.id === "building");
    const expr = wash.paint["fill-color"];
    expect(Array.isArray(expr)).toBe(true);
    expect(expr[0]).toBe("match");
    for (const c of [PALETTE.building, PALETTE.buildingPink, PALETTE.buildingCream]) {
      expect(expr).toContain(c);
    }
  });

  it("tints whole regions with a colorful drift layer", () => {
    const drift = layers.find((l) => l.id === "color-drift");
    expect(drift.type).toBe("background");
    expect(drift.paint["background-pattern"]).toBe("drift");
    expect(drift.paint["background-opacity"]).toBeLessThan(1);
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
    const order = ["road-shade", "road-casing", "road-major"].map((id) => layers.findIndex((l) => l.id === id));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("PALETTE_DARK", () => {
  it("maps every light palette color to a dark counterpart", () => {
    for (const color of Object.values(PALETTE)) {
      expect(PALETTE_DARK[color]).toBeTruthy();
    }
  });

  it("maps paper → near-black and ink → near-white", () => {
    expect(PALETTE_DARK[PALETTE.paper]).toBe("#1c1a17");
    expect(PALETTE_DARK[PALETTE.ink]).toBe("#e8dcc8");
  });

  it("maps inline hex values used in the style (wetland, rock, ice…)", () => {
    expect(PALETTE_DARK["#b7d9ac"]).toBe("#3c543c");
    expect(PALETTE_DARK["#e0d4bd"]).toBe("#464038");
    expect(PALETTE_DARK["#f4f0e6"]).toBe("#2a2824");
    expect(PALETTE_DARK["#eedbb8"]).toBe("#40382e");
    expect(PALETTE_DARK["#f7e3c4"]).toBe("#3c362c");
  });

  it("is reversible — the inverse map sends dark back to light", () => {
    const inv: Record<string, string> = {};
    for (const [k, v] of Object.entries(PALETTE_DARK)) inv[v] = k;
    for (const color of Object.values(PALETTE)) {
      expect(inv[PALETTE_DARK[color]]).toBe(color);
    }
  });
});

describe("remapValue", () => {
  it("swaps a plain string color", () => {
    expect(remapValue(PALETTE.paper, PALETTE_DARK)).toBe("#1c1a17");
  });

  it("leaves unknown strings alone", () => {
    expect(remapValue("#deadbeef", PALETTE_DARK)).toBe("#deadbeef");
  });

  it("walks a match-expression array and swaps every color leaf", () => {
    const expr = ["match", ["get", "class"], "wood", PALETTE.wood, PALETTE.grass];
    const out = remapValue(expr, PALETTE_DARK) as any[];
    expect(out[2]).toBe("wood");
    expect(out[3]).toBe(PALETTE_DARK[PALETTE.wood]);
    expect(out[4]).toBe(PALETTE_DARK[PALETTE.grass]);
  });

  it("recurses into nested paint objects", () => {
    const paint = {
      "fill-color": PALETTE.water,
      "fill-opacity": 0.9,
      "line-color": PALETTE.boundary,
    };
    const out = remapValue(paint, PALETTE_DARK) as Record<string, unknown>;
    expect(out["fill-color"]).toBe(PALETTE_DARK[PALETTE.water]);
    expect(out["fill-opacity"]).toBe(0.9);
    expect(out["line-color"]).toBe(PALETTE_DARK[PALETTE.boundary]);
  });

  it("passes through non-color values unchanged", () => {
    expect(remapValue(0.9, PALETTE_DARK)).toBe(0.9);
    expect(remapValue(null, PALETTE_DARK)).toBe(null);
    expect(remapValue(undefined, PALETTE_DARK)).toBe(undefined);
  });
});

describe("darkenStyle", () => {
  it("returns a valid v8 style with swapped colors and same layers", () => {
    const dark = darkenStyle({
      version: 8,
      layers: [
        { id: "background", type: "background", paint: { "background-color": PALETTE.paper } },
        { id: "water", type: "fill", paint: { "fill-color": PALETTE.water, "fill-opacity": 0.9 } },
      ],
    } as unknown as StyleSpecification);
    expect(dark.version).toBe(8);
    expect(dark.layers).toHaveLength(2);
    expect((dark.layers as any[])[0].paint["background-color"]).toBe(PALETTE_DARK[PALETTE.paper]);
    expect((dark.layers as any[])[1].paint["fill-color"]).toBe(PALETTE_DARK[PALETTE.water]);
    expect((dark.layers as any[])[1].paint["fill-opacity"]).toBe(0.9);
  });
});

describe("TEXTURE_OPACITY", () => {
  it("paper-grain and color-drift constants are valid numbers", () => {
    expect(typeof TEXTURE_OPACITY["paper-grain"]).toBe("number");
    expect(typeof TEXTURE_OPACITY["color-drift"]).toBe("number");
    expect(TEXTURE_OPACITY["paper-grain"]).toBeGreaterThan(0);
    expect(TEXTURE_OPACITY["color-drift"]).toBeGreaterThan(0);
  });

  it("TEXTURE_OPACITY_DARK is also valid and smaller than light version", () => {
    expect(typeof TEXTURE_OPACITY_DARK["paper-grain"]).toBe("number");
    expect(typeof TEXTURE_OPACITY_DARK["color-drift"]).toBe("number");
    expect(TEXTURE_OPACITY_DARK["paper-grain"]).toBeLessThan(TEXTURE_OPACITY["paper-grain"]);
    expect(TEXTURE_OPACITY_DARK["color-drift"]).toBeLessThan(TEXTURE_OPACITY["color-drift"]);
  });
});

describe("applyMapTheme", () => {
  it("swaps every paint color on every layer and is reversible", () => {
    const calls: { layerId: string; prop: string; value: unknown }[] = [];
    const map: MapInstance = {
      getStyle() {
        return {
          version: 8,
          layers: [
            { id: "background", type: "background", paint: { "background-color": PALETTE.paper } },
            { id: "water", type: "fill", paint: { "fill-color": PALETTE.water, "fill-opacity": 0.9 } },
            { id: "roads", type: "line", paint: { "line-color": PALETTE.road, "line-width": 2 } },
          ],
        } as unknown as StyleSpecification;
      },
      setPaintProperty(layerId, prop, value) {
        calls.push({ layerId, prop, value });
      },
    };

    applyMapTheme(map, true);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual({ layerId: "background", prop: "background-color", value: PALETTE_DARK[PALETTE.paper] });
    expect(calls[1]).toEqual({ layerId: "water", prop: "fill-color", value: PALETTE_DARK[PALETTE.water] });
    expect(calls[2]).toEqual({ layerId: "roads", prop: "line-color", value: PALETTE_DARK[PALETTE.road] });

    const before = calls.length;
    applyMapTheme(map, false);
    expect(calls.length).toBe(before);
  });

  it("skips layers without paint and is a no-op when no color matches", () => {
    const calls: { layerId: string; prop: string; value: unknown }[] = [];
    const map: MapInstance = {
      getStyle() {
        return {
          version: 8,
          layers: [
            { id: "grain", type: "background", paint: { "background-color": "rgba(0,0,0,0)" } },
            { id: "drift", type: "background", paint: { "background-pattern": "drift" } },
          ],
        } as unknown as StyleSpecification;
      },
      setPaintProperty(_layerId, _prop, _value) {},
    };
    applyMapTheme(map, true);
    expect(calls).toHaveLength(0);
  });
});