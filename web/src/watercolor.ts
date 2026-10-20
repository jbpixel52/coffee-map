/**
 * Watercolor style: our own theme over OpenFreeMap vector tiles (OSM data).
 *
 * The look follows Stamen Watercolor — warm paper, saturated colorful washes,
 * uneven pigment, soft blurred edges, faded-ink labels — but it is a *vector
 * re-theme*, not the original painted raster (that one is a Stadia-hosted
 * service; deliberately not used). Textures come from a self-hosted sprite
 * (web/public/styles/sprite.*, regenerate with scripts/make_sprite.py):
 * paper grain + fibers, building mottle, warm wash pooling, a large
 * multi-color drift, and blue water blooms.
 *
 * MapLibre quirks this file depends on:
 *  - a fill with BOTH fill-color and fill-pattern renders only the pattern,
 *    so "wash + speckle" needs two stacked layers (see building);
 *  - the sprite URL must be absolute — MapLibre feeds it to `new URL()`.
 *
 * Layer order: paper → area washes (+pooling, drift and blurred edges) →
 * water → borders → roads (blurred shade / casing / warm-white core) →
 * buildings → paper-grain → labels.
 */
import type { StyleSpecification } from "maplibre-gl";

const BASE = import.meta.env.BASE_URL;

// `window` is absent under vitest's node environment, hence the guard.
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost";

export const PALETTE = {
  paper: "#f8ead1",
  ink: "#332b22",
  inkMid: "#3f362b",
  inkSoft: "#463c31",
  inkRoad: "#5b4c3c",
  water: "#72cfe0",
  waterDeep: "#2f9dc2",
  waterLine: "#4fb4d4",
  waterName: "#2b7a97",
  grass: "#b6dc9a",
  wood: "#9fc47a",
  farmland: "#eed9a2",
  sand: "#f0e3c2",
  park: "#a8d488",
  moss: "#8fbe6a",
  landuse: "#f7dfc0",
  commercial: "#f3d0b4",
  building: "#e6c3a2",
  buildingPink: "#e9b09b",
  buildingCream: "#f0dcb9",
  road: "#fef8e4",
  roadMedium: "#fbf0d2",
  roadMinor: "#f8e9be",
  roadCasing: "#d6ad6a",
  roadShade: "#c99a5f",
  roadPath: "#cbb489",
  rail: "#b3a184",
  boundary: "#a08d76",
} as const;

export const SPRITE_IDS = ["paper", "mottle", "wash", "drift", "bloom"] as const;

const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
const FONT_ITALIC = ["Noto Sans Italic"];
const name = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as string;
const AREA_CLASSES = ["wood", "grass", "farmland", "sand", "wetland", "rock", "ice"];
const PARK_CLASSES = ["national_park", "protected_area"];

// pseudo-random per-feature tint: id % 3 → painted-block variety (Stamen-like)
const buildingTint = [
  "match",
  ["%", ["to-number", ["coalesce", ["id"], 0]], 3],
  0, PALETTE.buildingPink,
  1, PALETTE.building,
  PALETTE.buildingCream,
] as unknown as string;

export const watercolorStyle: StyleSpecification = {
  version: 8,
  name: "Watercolor (OSM)",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sprite: `${ORIGIN}${BASE}styles/sprite`,
  sources: {
    openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet", maxzoom: 14 },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": PALETTE.paper },
    },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], AREA_CLASSES, true, false],
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          "wood", PALETTE.wood,
          "grass", PALETTE.grass,
          "farmland", PALETTE.farmland,
          "sand", PALETTE.sand,
          "wetland", "#b7d9ac",
          "rock", "#e0d4bd",
          "ice", "#f4f0e6",
          PALETTE.landuse,
        ],
        "fill-opacity": ["match", ["get", "class"], "wood", 0.82, "grass", 0.78, 0.62],
      },
    },
    {
      // interior pooling on the greens: noise pattern above the flat fill
      id: "landcover-wash",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], AREA_CLASSES, true, false],
      paint: { "fill-pattern": "wash", "fill-opacity": 0.55 },
    },
    {
      // blurred edge so washes feather instead of ending on a vector line
      id: "landcover-bleed",
      type: "line",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["match", ["get", "class"], AREA_CLASSES, true, false],
      paint: {
        "line-color": PALETTE.moss,
        "line-opacity": 0.45,
        "line-blur": 4,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 8, 3, 14, 6],
      },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      filter: ["match", ["get", "class"], PARK_CLASSES, true, false],
      paint: { "fill-color": PALETTE.park, "fill-opacity": 0.65 },
    },
    {
      id: "park-wash",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      filter: ["match", ["get", "class"], PARK_CLASSES, true, false],
      paint: { "fill-pattern": "wash", "fill-opacity": 0.55 },
    },
    {
      id: "park-bleed",
      type: "line",
      source: "openmaptiles",
      "source-layer": "park",
      filter: ["match", ["get", "class"], PARK_CLASSES, true, false],
      paint: {
        "line-color": PALETTE.moss,
        "line-opacity": 0.45,
        "line-blur": 4,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2, 14, 6],
      },
    },
    {
      id: "landuse",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: [
        "match",
        ["get", "class"],
        ["residential", "commercial", "retail", "industrial", "cemetery", "school", "university", "hospital", "stadium", "pitch", "playground", "zoo", "theme_park", "military", "railway", "garages", "bus_station"],
        true,
        false,
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          "commercial", PALETTE.commercial,
          "retail", PALETTE.commercial,
          "industrial", "#eedbb8",
          "cemetery", "#b8d693",
          "school", "#f7e3c4",
          "university", "#f7e3c4",
          "hospital", "#f7e3c4",
          ["stadium", "pitch", "playground"], PALETTE.grass,
          PALETTE.landuse,
        ],
        "fill-opacity": [
          "match",
          ["get", "class"],
          "residential", 0.6,
          "cemetery", 0.5,
          ["stadium", "pitch", "playground"], 0.6,
          0.45,
        ],
      },
    },
    {
      // pooling inside urban blocks too — the city reads as one big wash
      id: "landuse-wash",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: [
        "match",
        ["get", "class"],
        ["residential", "commercial", "retail", "industrial", "school", "university", "hospital"],
        true,
        false,
      ],
      paint: { "fill-pattern": "wash", "fill-opacity": 0.45 },
    },
    {
      // large multi-color blobs: uneven pigment across whole regions
      id: "color-drift",
      type: "background",
      paint: { "background-color": "rgba(0,0,0,0)", "background-pattern": "drift", "background-opacity": 0.42 },
    },
    {
      // soft bleed under the water fill: a blurred line reads as a wash edge
      id: "water-bleed",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": PALETTE.waterDeep,
        "line-opacity": 0.7,
        "line-blur": 7,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 7, 16, 16],
      },
    },
    {
      // wide, faint feather: the shore bleeds into the sand, wet-on-wet
      id: "water-shore",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": PALETTE.waterDeep,
        "line-opacity": 0.3,
        "line-blur": 12,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 6, 12, 14, 16, 30],
      },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": PALETTE.water, "fill-opacity": 0.92 },
    },
    {
      // blue blooms inside the water: fill-color + fill-pattern would hide
      // the color, so the pooling rides above the plain fill as its own layer
      id: "water-wash",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-pattern": "bloom", "fill-opacity": 0.9 },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: {
        "line-color": PALETTE.waterLine,
        "line-opacity": 0.8,
        "line-blur": 0.5,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 2, 16, 4],
      },
    },
    {
      id: "boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], "2"], ["!=", ["get", "disputed"], "1"]],
      paint: {
        "line-color": PALETTE.boundary,
        "line-opacity": 0.5,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 10, 1.6],
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "boundary-state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["match", ["get", "admin_level"], ["3", "4"], true, false],
      paint: {
        "line-color": PALETTE.boundary,
        "line-opacity": 0.4,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 12, 1.2],
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", ["get", "class"], "rail"],
      paint: {
        "line-color": PALETTE.rail,
        "line-opacity": 0.55,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 2],
        "line-dasharray": [2, 2],
      },
    },
    {
      // blurred tan under roads: the hand-drawn shading behind the white core
      id: "road-shade",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "all",
        ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary"], true, false],
        ["!=", ["get", "subclass"], "ferry"],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.roadShade,
        "line-opacity": 0.55,
        "line-blur": 3,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 12, 5, 16, 14],
      },
    },
    {
      // drawn street edge: keeps streets readable on the cream paper
      id: "road-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "match",
        ["get", "class"],
        ["motorway", "trunk", "primary", "secondary", "tertiary"],
        true,
        false,
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.roadCasing,
        "line-opacity": 0.65,
        "line-blur": 0.6,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.4, 12, 3.8, 16, 11],
      },
    },
    {
      id: "road-major",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.road,
        "line-opacity": 0.95,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 10, 3, 16, 9],
      },
    },
    {
      id: "road-medium",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.roadMedium,
        "line-opacity": 0.92,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 12, 2.4, 16, 6.5],
      },
    },
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["minor", "service"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.roadMinor,
        "line-opacity": 0.9,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 14, 1.3, 16, 3.5],
      },
    },
    {
      id: "road-path",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["path", "track"], true, false],
      paint: {
        "line-color": PALETTE.roadPath,
        "line-opacity": 0.7,
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.5, 16, 1.6],
        "line-dasharray": [2, 2],
      },
    },
    {
      // wash + speckle: fill-color and fill-pattern can't share one fill layer.
      // The tint varies per feature id so blocks look individually painted.
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-color": buildingTint,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.6, 15.5, 0.72, 17, 0.78],
      },
    },
    {
      id: "building-mottle",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 15,
      // slight off-register like a hand-pulled print — kills the "digital
      // texture perfectly aligned with crisp geometry" look
      paint: { "fill-pattern": "mottle", "fill-opacity": 0.6, "fill-translate": [1, 1] },
    },
    {
      // paper grain over every wash and road, with the ink labels drawn above
      id: "paper-grain",
      type: "background",
      paint: { "background-color": "rgba(0,0,0,0)", "background-pattern": "paper", "background-opacity": 0.82 },
    },
    {
      id: "water-name",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      layout: {
        "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
        "text-font": FONT_ITALIC,
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 16, 15],
        "text-letter-spacing": 0.03,
      },
      paint: { "text-color": PALETTE.waterName, "text-halo-color": PALETTE.paper, "text-halo-width": 1.6 },
    },
    {
      id: "transport-name-major",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 13.5,
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false],
      layout: {
        "symbol-placement": "line",
        "text-field": name,
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 14, 11, 18, 13],
        "text-letter-spacing": 0.02,
      },
      paint: { "text-color": PALETTE.inkRoad, "text-halo-color": PALETTE.paper, "text-halo-width": 1.4 },
    },
    {
      id: "transport-name-medium",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 15,
      filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false],
      layout: {
        "symbol-placement": "line",
        "text-field": name,
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 15, 10, 18, 12.5],
      },
      paint: { "text-color": PALETTE.inkRoad, "text-halo-color": PALETTE.paper, "text-halo-width": 1.3 },
    },
    {
      id: "place-city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 5,
      filter: ["==", ["get", "class"], "city"],
      layout: {
        "text-field": name,
        "text-font": FONT_BOLD,
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 10, 16, 16, 21.5],
        "text-letter-spacing": 0.04,
        "text-max-width": 8,
      },
      paint: { "text-color": PALETTE.ink, "text-halo-color": PALETTE.paper, "text-halo-width": 2.4 },
    },
    {
      id: "place-town",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 9,
      filter: ["==", ["get", "class"], "town"],
      layout: {
        "text-field": name,
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 12, 13, 16, 16],
        "text-max-width": 8,
      },
      paint: { "text-color": PALETTE.inkMid, "text-halo-color": PALETTE.paper, "text-halo-width": 1.9 },
    },
    {
      id: "place-small",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 10,
      filter: ["match", ["get", "class"], ["village", "suburb", "neighbourhood"], true, false],
      layout: {
        "text-field": name,
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9.5, 14, 12.5, 16, 14],
        "text-max-width": 8,
      },
      paint: { "text-color": PALETTE.inkSoft, "text-halo-color": PALETTE.paper, "text-halo-width": 1.6 },
    },
  ],
};
