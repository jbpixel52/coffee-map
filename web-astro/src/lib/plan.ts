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

/**
 * Pantone NYFW Spring/Summer 2027 (TCX), the seasonless shades as the ground
 * and Blue Indigo as the ink: Antique White 11-0105, Dolphin 16-2901,
 * Blue Indigo 19-3928, Tarragon 15-0326, Waterfall 15-5516.
 * Hex values: W3Schools' 2027 list (codes matched to Pantone's report).
 */
export const PANTONE = {
  aniseFlower: "#F4E3B5", // 12-0717
  princessBlue: "#00539C", // 19-4150
  waterfall: "#3AB0A2", // 15-5516
  langoustino: "#CA6C56", // 16-1440
  chiliPepper: "#9B1B30", // 19-1557
  rosyFuture: "#F37E9B", // 15-1910
  dragonFire: "#FD652D", // 16-1460
  daiquiriGreen: "#C9D77E", // 12-0435
  hibiscus: "#DE3848", // 18-1762
  lavenderOil: "#C3A6CD", // 15-3615
  antiqueWhite: "#EEE5D3", // 11-0105
  tarragon: "#A4AE77", // 15-0326
  arrowwood: "#BC8D1F", // 16-0954
  blueIndigo: "#49516D", // 19-3928
  dolphin: "#9A9699", // 16-2901
} as const;

/** The plan's own colours, all tints of the seasonless shades. Lowercase on
 * purpose: the night remap compares strings, so both directions agree. */
export const PLAN = {
  paper: PANTONE.antiqueWhite.toLowerCase(),
  paperDeep: "#e1d8ca", // Dolphin 16% over Antique White — building fill
  ink: PANTONE.blueIndigo.toLowerCase(),
  inkSoft: "#606479", // Blue Indigo 72% over Dolphin
  inkFaint: "#7c8093", // quieter figures, water names
  water: "#aad1c0", // Waterfall 38% over Antique White
  waterLine: "#86c0b2", // Waterfall 55%
  waterName: "#35665f", // Waterfall, deep
  park: "#cfceac", // Tarragon 42%
  landcover: "#e1dbc2", // Tarragon 18%
  building: "#e1d8ca",
  boundary: PANTONE.blueIndigo.toLowerCase(),
} as const;

/**
 * light colour → night colour, keyed by the literal hex. Literal keys on
 * purpose: PLAN.ink and PLAN.boundary are the same ink, and computed keys
 * would collide.
 */
export const PLAN_NIGHT: Record<string, string> = {
  "#eee5d3": "#191c27", // Antique White ground → Blue Indigo night
  "#e1d8ca": "#232630", // buildings
  "#49516d": "#f2eada", // Blue Indigo ink → Antique White (never the same hex both ways)
  "#606479": "#d3ccc0", // ink-soft
  "#7c8093": "#a6a093", // ink-faint
  "#aad1c0": "#173738", // water
  "#86c0b2": "#235150", // waterline
  "#35665f": "#8fbdb4", // water name
  "#cfceac": "#2d3029", // park
  "#e1dbc2": "#1d201f", // landcover
};

/** Calor: heat tints the sheet. Light = pigment on paper; night = light on black. */
export const HEAT_LIGHT: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(244, 227, 181, 0)", // Anise Flower
  0.25,
  "rgba(244, 227, 181, 0.5)",
  0.5,
  "rgba(188, 141, 31, 0.5)", // Arrowwood
  0.75,
  "rgba(202, 108, 86, 0.55)", // Langoustino
  1,
  "rgba(155, 27, 48, 0.65)", // Chili Pepper
];

export const HEAT_NIGHT: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(244, 227, 181, 0)", // Anise Flower
  0.35,
  "rgba(244, 227, 181, 0.38)",
  0.65,
  "rgba(195, 166, 205, 0.5)", // Lavender Oil
  1,
  "rgba(243, 126, 155, 0.62)", // Rosy Future
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

/** Deep-walk a style value, swapping any colour match. Case-insensitive: the
 * palette is written uppercase (Pantone codes) and the night table lowercase. Pure. */
export function remapColor(value: unknown, remap: Record<string, string>): unknown {
  if (typeof value === "string") return remap[value.toLowerCase()] ?? value;
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
