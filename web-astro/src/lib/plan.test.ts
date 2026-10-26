import { describe, expect, it } from "vitest";
import {
  applyPlanTheme,
  HEAT_LIGHT,
  HEAT_NIGHT,
  LINE_OPACITY,
  PLAN,
  PLAN_NIGHT,
  planStyle,
  remapColor,
} from "./plan";

/** Every string colour that appears anywhere in the style's paint blocks. */
function styleColours(): string[] {
  const out = new Set<string>();
  for (const layer of planStyle.layers as Array<{ paint?: Record<string, unknown> }>) {
    const walk = (v: unknown) => {
      if (typeof v === "string") {
        if (/^#[0-9a-f]{6}$/i.test(v)) out.add(v.toLowerCase());
      } else if (Array.isArray(v)) {
        v.forEach(walk);
      }
    };
    walk(layer.paint);
  }
  return [...out];
}

describe("planStyle", () => {
  it("is a keyless, sprite-less style over OpenFreeMap tiles", () => {
    expect(planStyle.version).toBe(8);
    expect(planStyle.glyphs).toContain("tiles.openfreemap.org/fonts");
    expect(planStyle.sprite).toBeUndefined();
    const src = planStyle.sources.openmaptiles as { url: string };
    expect(src.url).toBe("https://tiles.openfreemap.org/planet");
  });

  it("has unique layer ids and the plan's structure", () => {
    const ids = planStyle.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "background",
      "water",
      "road-motorway",
      "road-minor",
      "place-neighbourhood",
      "place-city",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("draws roads as hairlines with no casing, and no texture patterns anywhere", () => {
    const ids = planStyle.layers.map((l) => l.id);
    expect(ids.some((id) => id.includes("casing"))).toBe(false);
    for (const layer of planStyle.layers as Array<{ paint?: Record<string, unknown> }>) {
      const paint = layer.paint ?? {};
      expect(Object.keys(paint).some((k) => k.endsWith("-pattern"))).toBe(false);
    }
  });

  it("leaves out furniture: no POI, road-name or house-number layers", () => {
    const layers = planStyle.layers as Array<{ "source-layer"?: string }>;
    const sourceLayers = layers.map((l) => l["source-layer"]).filter(Boolean);
    expect(sourceLayers).not.toContain("poi");
    expect(sourceLayers).not.toContain("transportation_name");
    expect(sourceLayers).not.toContain("housenumber");
  });

  it("gives every colour in the style a night counterpart", () => {
    const missing = styleColours().filter((c) => !(c in PLAN_NIGHT));
    expect(missing).toEqual([]);
  });

  it("keeps day and night colours disjoint, so a remap can never alias", () => {
    const day = new Set(styleColours());
    const night = new Set(Object.values(PLAN_NIGHT).map((c) => c.toLowerCase()));
    const overlap = [...night].filter((c) => day.has(c));
    expect(overlap).toEqual([]);
  });
});

describe("line weights", () => {
  // map lines are background: they must stay quieter than the dots (6.47:1)
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (fg: string, bg: string, a: number) =>
    rgb(fg).map((c, i) => c * a + rgb(bg)[i] * (1 - a));
  const lum = (c: number[]) => {
    const f = (v: number) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a: number[], ground: string = PLAN.paper) => {
    const la = lum(a), lb = lum(rgb(ground));
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  };

  it("keeps every line between 1.2:1 and 2.6:1 against the sheet", () => {
    for (const [id, op] of Object.entries(LINE_OPACITY)) {
      const c = contrast(mix(PLAN.ink, PLAN.paper, op.day));
      expect(c, `${id} day`).toBeGreaterThan(1.2);
      expect(c, `${id} day`).toBeLessThan(2.6);
    }
  });

  it("keeps the night lines just as quiet", () => {
    for (const [id, op] of Object.entries(LINE_OPACITY)) {
      const ground = PLAN_NIGHT[PLAN.paper];
      const c = contrast(mix(PLAN_NIGHT[PLAN.ink], ground, op.night), ground);
      expect(c, `${id} night`).toBeLessThan(3.2);
    }
  });
});

describe("remapColor", () => {
  it("swaps exact matches and leaves everything else alone, without mutating", () => {
    const input = ["case", ["get", "x"], PLAN.paper, "#123456"];
    const out = remapColor(input, PLAN_NIGHT) as unknown[];
    expect(out[2]).toBe(PLAN_NIGHT[PLAN.paper.toLowerCase()]);
    expect(out[3]).toBe("#123456");
    expect(input[2]).toBe(PLAN.paper);
  });
});

describe("applyPlanTheme", () => {
  function fakeMap(layers: Array<{ id: string; type: string; paint?: Record<string, unknown> }>) {
    const calls: Array<[string, string, unknown]> = [];
    return {
      calls,
      getStyle: () => ({ layers }),
      // simulate MapLibre: the property really changes on the layer
      setPaintProperty: (id: string, prop: string, value: unknown) => {
        calls.push([id, prop, value]);
        const layer = layers.find((l) => l.id === id);
        if (layer) layer.paint = { ...(layer.paint ?? {}), [prop]: value };
      },
    };
  }

  it("flips the sheet's background to ink at night and back to paper by day", () => {
    const map = fakeMap([
      { id: "background", type: "background", paint: { "background-color": PLAN.paper } },
    ]);
    applyPlanTheme(map, true);
    expect(map.calls.at(-1)).toEqual([
      "background",
      "background-color",
      PLAN_NIGHT[PLAN.paper.toLowerCase()],
    ]);
    applyPlanTheme(map, false);
    expect(map.calls.at(-1)).toEqual(["background", "background-color", PLAN.paper]);
  });

  it("swaps the heat ramp with the theme", () => {
    const map = fakeMap([
      { id: "shops-heat", type: "heatmap", paint: { "heatmap-color": HEAT_LIGHT } },
    ]);
    applyPlanTheme(map, true);
    expect(map.calls.some(([, , v]) => v === HEAT_NIGHT)).toBe(true);
  });

  it("is idempotent: repeating the same mode does not re-remap", () => {
    const map = fakeMap([
      { id: "background", type: "background", paint: { "background-color": PLAN.paper } },
    ]);
    applyPlanTheme(map, true);
    const after = map.calls.length;
    applyPlanTheme(map, true);
    expect(map.calls.length).toBe(after);
    expect((map.getStyle().layers![0].paint as Record<string, unknown>)["background-color"]).toBe(
      PLAN_NIGHT[PLAN.paper.toLowerCase()],
    );
  });

  it("touches nothing when the style has no layers yet", () => {
    const map = { calls: [] as unknown[], getStyle: () => null, setPaintProperty: () => {} };
    expect(() => applyPlanTheme(map, true)).not.toThrow();
  });
});
