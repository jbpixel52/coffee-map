/**
 * "Hoja" — the printed city plan under the sign system.
 *
 * The map is a technical sheet, not a painting: pale paper, black hairline
 * roads with no casings, flat sage parks, grey-blue water, monumentally
 * lettered place names. Everything that is furniture (road names, POIs,
 * buildings above a whisper) is left out so the bands and the dots own the
 * screen. No sprite: the world has no textures.
 *
 * Night ("noche") is the same sheet inverted — black ground, warm paper ink —
 * driven by PLAN_NIGHT as a colour remap, so one walk over the style's paint
 * properties flips the whole map without re-adding sources.
 */
import type { StyleSpecification } from "maplibre-gl";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";

export const PLAN = {
  paper: "#eeede7",
  paperDeep: "#e4e2d8",
  ink: "#12100c",
  inkSoft: "#3a382f",
  inkFaint: "#6b685c",
  water: "#b8cdd6",
  waterLine: "#9fbac6",
  waterName: "#4a6b78",
  park: "#c6cfc0",
  landcover: "#dde3d6",
  building: "#e2e0d6",
  boundary: "#12100c",
} as const;

/**
 * light colour → night colour, keyed by the literal hex. Literal keys on
 * purpose: PLAN.ink and PLAN.boundary are the same ink, and computed keys
 * would collide.
 */
export const PLAN_NIGHT: Record<string, string> = {
  "#eeede7": "#100e0a", // paper (ground) — night values never reuse a day hex
  "#e4e2d8": "#191510", // paper-deep (buildings' fill)
  "#12100c": "#f4ecd8", // ink: roads, boundaries, city labels
  "#3a382f": "#d8cfb6", // ink-soft
  "#6b685c": "#a89e86", // ink-faint
  "#b8cdd6": "#16232b", // water
  "#9fbac6": "#22343e", // waterline
  "#4a6b78": "#8fb4c2", // water name
  "#c6cfc0": "#1d2418", // park
  "#dde3d6": "#1a1e17", // landcover
  "#e2e0d6": "#1a1713", // building
};

/** Calor: heat tints the sheet. Light = pigment on paper; night = light on black. */
export const HEAT_LIGHT: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(242, 194, 48, 0)",
  0.25,
  "rgba(242, 194, 48, 0.45)",
  0.5,
  "rgba(232, 138, 30, 0.6)",
  0.75,
  "rgba(194, 64, 42, 0.72)",
  1,
  "rgba(90, 20, 12, 0.85)",
];

export const HEAT_NIGHT: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(240, 232, 210, 0)",
  0.25,
  "rgba(242, 194, 48, 0.4)",
  0.5,
  "rgba(255, 214, 102, 0.55)",
  0.75,
  "rgba(255, 236, 180, 0.7)",
  1,
  "rgba(255, 248, 225, 0.88)",
];

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
const name = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as string;
const AREA_CLASSES = ["wood", "grass", "farmland", "wetland", "rock", "sand"];
const PARK_CLASSES = ["national_park", "protected_area"];

/** Road classes: one hairline each, no casing — a plan, not a road atlas. */
const ROADS: Array<{ id: string; classes: string[]; width: number; opacity: number }> = [
  { id: "road-motorway", classes: ["motorway", "trunk"], width: 1.9, opacity: 0.92 },
  { id: "road-primary", classes: ["primary"], width: 1.35, opacity: 0.8 },
  { id: "road-secondary", classes: ["secondary", "tertiary"], width: 0.95, opacity: 0.6 },
  { id: "road-minor", classes: ["minor", "street", "service"], width: 0.6, opacity: 0.32 },
];

export const planStyle: StyleSpecification = {
  version: 8,
  name: "Hoja (OSM)",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet", maxzoom: 14 },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": PLAN.paper } },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], AREA_CLASSES, true, false],
      paint: { "fill-color": PLAN.landcover, "fill-opacity": 0.85 },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      filter: ["match", ["get", "class"], PARK_CLASSES, false, true],
      paint: { "fill-color": PLAN.park },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": PLAN.water },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: { "line-color": PLAN.waterLine, "line-width": 1.1 },
    },
    {
      id: "boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      paint: {
        "line-color": PLAN.boundary,
        "line-width": 1.6,
        "line-dasharray": [4, 2],
        "line-opacity": 0.55,
      },
    },
    {
      id: "boundary-state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 4],
      paint: { "line-color": PLAN.boundary, "line-width": 1, "line-dasharray": [2, 3], "line-opacity": 0.35 },
    },
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", ["get", "class"], "rail"],
      paint: { "line-color": PLAN.ink, "line-width": 0.9, "line-dasharray": [1, 2], "line-opacity": 0.35 },
    },
    ...ROADS.map((r) => ({
      id: r.id,
      type: "line" as const,
      source: "openmaptiles" as const,
      "source-layer": "transportation",
      filter: ["match", ["get", "class"], r.classes, true, false] as never,
      minzoom: r.id === "road-minor" ? 13 : 8,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: {
        "line-color": PLAN.ink,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, r.width * 0.7, 16, r.width * 1.5] as never,
        "line-opacity": r.opacity,
      },
    })),
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14.5,
      paint: { "fill-color": PLAN.building, "fill-opacity": 0.9 },
    },
    {
      // the world's lettering: neighbourhoods set like a sign, not a caption
      id: "place-neighbourhood",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 9,
      filter: ["match", ["get", "class"], ["suburb", "quarter", "neighbourhood", "village"], true, false],
      layout: {
        "text-field": ["upcase", name] as never,
        "text-font": FONT_BOLD,
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 13, 12, 21, 15, 30] as never,
        "text-letter-spacing": 0.1,
        "text-max-width": 9,
        "text-padding": 6,
      },
      paint: { "text-color": PLAN.ink, "text-opacity": 0.5, "text-halo-color": PLAN.paper, "text-halo-width": 1.2 },
    },
    {
      id: "place-town",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 9,
      filter: ["==", ["get", "class"], "town"],
      layout: {
        "text-field": ["upcase", name] as never,
        "text-font": FONT_BOLD,
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 12, 14, 18] as never,
        "text-letter-spacing": 0.12,
      },
      paint: { "text-color": PLAN.inkSoft, "text-halo-color": PLAN.paper, "text-halo-width": 1.4 },
    },
    {
      id: "place-city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 5,
      filter: ["==", ["get", "class"], "city"],
      layout: {
        "text-field": ["upcase", name] as never,
        "text-font": FONT_BOLD,
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 12, 10, 20, 14, 26] as never,
        "text-letter-spacing": 0.16,
      },
      paint: { "text-color": PLAN.ink, "text-halo-color": PLAN.paper, "text-halo-width": 1.8 },
    },
    {
      id: "water-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      minzoom: 10,
      layout: {
        "text-field": ["upcase", name] as never,
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 16, 12] as never,
        "text-letter-spacing": 0.14,
      },
      paint: { "text-color": PLAN.waterName, "text-halo-color": PLAN.paper, "text-halo-width": 1 },
    },
  ],
};

/** Deep-walk a style value, swapping any exact colour match. Pure. */
export function remapColor(value: unknown, remap: Record<string, string>): unknown {
  if (typeof value === "string") return remap[value] ?? value;
  if (Array.isArray(value)) return value.map((v) => remapColor(v, remap));
  return value;
}

interface ThemedMap {
  getStyle(): { layers?: Array<{ id: string; type: string; paint?: Record<string, unknown> }> } | null;
  setPaintProperty(layer: string, prop: string, value: unknown): void;
}

/**
 * Which sheet each map is currently showing. The style ships light, so an
 * unknown map is "day"; without this guard a day-time call would run the night
 * remap backwards and paint the ink paper-coloured (invisible).
 */
const sheetMode = new WeakMap<object, "day" | "night">();

/** Flip the sheet between paper and noche, heat ramp included. Idempotent. */
export function applyPlanTheme(map: ThemedMap, night: boolean): void {
  const target: "day" | "night" = night ? "night" : "day";
  if ((sheetMode.get(map as object) ?? "day") === target) return;
  const style = map.getStyle();
  if (!style?.layers) return;
  const remap = night ? PLAN_NIGHT : invert(PLAN_NIGHT);
  for (const layer of style.layers) {
    const paint = layer.paint;
    if (!paint) continue;
    if (layer.type === "heatmap" && "heatmap-color" in paint) {
      map.setPaintProperty(layer.id, "heatmap-color", night ? HEAT_NIGHT : HEAT_LIGHT);
    }
    for (const [prop, value] of Object.entries(paint)) {
      const next = remapColor(value, remap);
      if (JSON.stringify(next) !== JSON.stringify(value)) map.setPaintProperty(layer.id, prop, next);
    }
  }
  sheetMode.set(map as object, target);
}

function invert(remap: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [light, night] of Object.entries(remap)) out[night] = light;
  return out;
}
