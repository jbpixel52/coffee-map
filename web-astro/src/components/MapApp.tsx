/** Root island: owns the MapLibre instance, app state, and Tamagui chrome. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { TamaguiProvider } from "tamagui";
import type { Feature, FeatureCollection, Point } from "geojson";
import config from "../tamagui.config";
import { shopMatches, type ShopProps } from "../lib/filter";
import { popupHtml } from "../lib/popup";
import { watercolorStyle, applyMapTheme, HEAT_COLORS_LIGHT } from "../lib/watercolor";
import { buildZones } from "../lib/zones";
import { detailsFromProps, type ShopDetails } from "../lib/details";
import { bboxFromCircle, imageCoordinates, loadArtMeta, type ArtMeta } from "../lib/art";
import TopBar from "./TopBar";
import ShopCard from "./ShopCard";
import ShopMenu from "./ShopMenu";
import PwaBanner from "./PwaBanner";

const BASE = import.meta.env.BASE_URL;

/** More translucent than the old 0.7 — heat should tint the map, not paint over it. */
const HEAT_OPACITY = 0.28;
/** Transition layer ends here; above it the vector style takes over. */
const ART_VISIBLE_TO = 15;
/** MapLibre id for the prettymaps raster layer + its image source. */
const ART_LAYER = "pretty-art";

interface Meta {
  generated_at?: string;
}

export default function MapApp() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const topbarEl = useRef<HTMLDivElement | null>(null);
  const footerEl = useRef<HTMLElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const fcRef = useRef<FeatureCollection<Point> | null>(null);
  const artMetaRef = useRef<ArtMeta | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const mapReady = status === "ready";
  const [art, setArt] = useState(true);
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [generated, setGenerated] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [heat, setHeat] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyIg, setOnlyIg] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<ShopDetails | null>(null);

  /** Close the detail card, the shop menu and the map popup together. */
  const closeAll = useCallback(() => {
    setSelected(null);
    setMenuOpen(false);
    popupRef.current?.remove();
    popupRef.current = null;
  }, []);

  // ── Boot: fetch data, create map, wire layers + events (once) ──
  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    async function boot() {
      const [fc, meta, artMeta] = await Promise.all([
        fetch(`${BASE}data/shops.geojson`).then(
          (r) => r.json() as Promise<FeatureCollection<Point>>,
        ),
        fetch(`${BASE}data/meta.json`).then((r) => r.json() as Promise<Meta>),
        loadArtMeta(BASE),
      ]);
      if (cancelled || !mapEl.current) return;
      fcRef.current = fc;
      artMetaRef.current = artMeta;
      setTotal(fc.features.length);
      setNames(fc.features.map((f) => (f.properties as ShopProps)?.name ?? "Desconocido"));
      if (meta.generated_at) setGenerated(`actualizado ${meta.generated_at}`);

      const params = new URLSearchParams(location.search);
      const ll = (params.get("ll") ?? "").split(",").map(Number);
      const zq = Number(params.get("z"));
      const cam =
        ll.length === 2 && ll.every(Number.isFinite) && Number.isFinite(zq)
          ? { center: [ll[0], ll[1]] as [number, number], zoom: zq }
          : { center: [-117.0382, 32.5149] as [number, number], zoom: 12.4 };

      map = new maplibregl.Map({
        container: mapEl.current,
        style: watercolorStyle,
        center: cam.center,
        zoom: cam.zoom,
      });
      mapRef.current = map;
      (window as unknown as Record<string, unknown>).__map = map;
      (window as unknown as Record<string, unknown>).__shops = fc.features;

      const el = mapEl.current;
      el.classList.add("moving");
      map.on("movestart", () => el.classList.add("moving"));
      map.on("zoomstart", () => el.classList.add("moving"));
      map.on("idle", () => el.classList.remove("moving"));

      map.on("load", () => {
        if (!map) return;
        // prettymaps poster as the base map: a georeferenced raster draped over
        // the watercolor style inside its bbox, fading out as you zoom in.
        const artMeta = artMetaRef.current;
        if (artMeta) {
          const bb = bboxFromCircle(artMeta.center[0], artMeta.center[1], artMeta.radius_m);
          map.addSource(ART_LAYER, {
            type: "image",
            url: `${BASE}art/${artMeta.image}`,
            coordinates: imageCoordinates(bb),
          });
          map.addLayer({
            id: ART_LAYER,
            type: "raster",
            source: ART_LAYER,
            paint: {
              "raster-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11,
                1,
                13.5,
                0.9,
                ART_VISIBLE_TO,
                0,
              ],
              "raster-fade-duration": 400,
            },
          });
        }
        map.addSource("shops", { type: "geojson", data: fc });
        map.addLayer({
          id: "shops-halo",
          type: "circle",
          source: "shops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 10.5],
            "circle-color": ["case", ["has", "instagram"], "#c2410c", "#1d4ed8"],
            "circle-opacity": 0.25,
            "circle-blur": 0.9,
          },
        });
        map.addLayer({
          id: "shops",
          type: "circle",
          source: "shops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6],
            "circle-color": ["case", ["has", "instagram"], "#c2410c", "#1d4ed8"],
            "circle-blur": 0.12,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.2,
          },
        });
        // Heatmap — follower-weighted, translucent, hidden by default.
        map.addLayer({
          id: "shops-heat",
          type: "heatmap",
          source: "shops",
          layout: { visibility: "none" },
          paint: {
            "heatmap-weight": ["coalesce", ["to-number", ["get", "ig_followers"]], 1],
            "heatmap-intensity": 0.55,
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 20, 30],
            "heatmap-color": HEAT_COLORS_LIGHT,
            "heatmap-opacity": HEAT_OPACITY,
          },
        });
        // Per-zone cluster circles, shown with the heatmap.
        map.addSource("zones", { type: "geojson", data: buildZones(fc) });
        map.addLayer({
          id: "zones-heat",
          type: "circle",
          source: "zones",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 16],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "zone_followers"],
              0, "rgba(33,102,172,0.4)",
              100, "rgba(103,169,207,0.5)",
              500, "rgba(209,229,240,0.6)",
              2000, "rgba(253,174,97,0.7)",
              5000, "rgba(239,59,44,0.85)",
            ],
            "circle-opacity": 0.55,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1,
          },
        });

        map.on("click", "shops", (e) => {
          const f = e.features?.[0];
          if (!f || !map) return;
          const p = f.properties as Record<string, unknown> & ShopProps;
          setSelected(detailsFromProps(p));
          // quick preview at the dot itself
          popupRef.current?.remove();
          const [lon, lat] = (f.geometry as Point).coordinates;
          popupRef.current = new maplibregl.Popup({ maxWidth: "340px" })
            .setLngLat([lon, lat])
            .setHTML(popupHtml({ ...p, lat, lon }))
            .addTo(map);
        });

        map.on("click", (e) => {
          // Clicking empty map space closes card + popup — but a shop click
          // lands here too (layer handlers run first), so guard on a hit-test.
          if (!map) return;
          const feats = map.queryRenderedFeatures(e.point, { layers: ["shops"] });
          if (feats.length === 0) {
            closeAll();
          }
        });

        setStatus("ready");
      });
    }

    boot().catch((err) => {
      console.error("boot failed", err);
      setStatus("error");
    });
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dark theme: html class + live map repaint ──
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    const map = mapRef.current;
    if (map && mapReady) {
      applyMapTheme(map, dark);
      // the prettymaps poster is a light print — dim it instead of hiding it
      if (map.getLayer(ART_LAYER)) {
        map.setPaintProperty(ART_LAYER, "raster-brightness-max", dark ? 0.55 : 1);
        map.setPaintProperty(ART_LAYER, "raster-saturation", dark ? -0.2 : 0);
      }
    }
  }, [dark, mapReady]);

  // ── prettymaps art toggle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(ART_LAYER)) return;
    map.setLayoutProperty(ART_LAYER, "visibility", art ? "visible" : "none");
  }, [art, mapReady]);

  // ── Shareable view: keep ?ll=&z= in the URL as the map moves ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const sync = () => {
      const c = map.getCenter();
      const url = new URL(location.href);
      url.searchParams.set("ll", `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`);
      url.searchParams.set("z", map.getZoom().toFixed(2));
      history.replaceState(null, "", url);
    };
    map.on("moveend", sync);
    return () => {
      map.off("moveend", sync);
    };
  }, [mapReady]);

  // ── Escape closes the card and the shop menu ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll]);

  // Follow OS theme changes until the user overrides (toggle always wins later).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Heatmap visibility ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const heatVis = heat ? "visible" : "none";
    const spotVis = heat ? "none" : "visible";
    for (const [id, vis] of [
      ["shops-heat", heatVis],
      ["zones-heat", heatVis],
      ["shops", spotVis],
      ["shops-halo", spotVis],
    ] as const) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [heat, mapReady]);

  // ── Filters ──
  useEffect(() => {
    const map = mapRef.current;
    const fc = fcRef.current;
    if (!map || !mapReady || !fc) return;
    const shownFeatures = fc.features.filter((f) =>
      shopMatches(f.properties as ShopProps, query, onlyIg),
    );
    setShown(shownFeatures.length);
    (map.getSource("shops") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: shownFeatures,
    });
  }, [query, onlyIg, mapReady]);

  // ── Layout: measure topbar/footer into CSS vars (map + panels position off them) ──
  useEffect(() => {
    const setLayout = () => {
      const topbarH = topbarEl.current?.offsetHeight ?? 68;
      const footerH = footerEl.current?.offsetHeight ?? 44;
      document.documentElement.style.setProperty("--topbar-h", `${topbarH}px`);
      document.documentElement.style.setProperty("--footer-h", `${footerH}px`);
      document.documentElement.style.setProperty("--map-top", `${12 + topbarH + 8}px`);
    };
    setLayout();
    window.addEventListener("resize", setLayout);
    return () => window.removeEventListener("resize", setLayout);
  }, []);

  const selectByName = useCallback(
    (name: string) => {
      const fc = fcRef.current;
      const f = fc?.features.find(
        (feat) => ((feat.properties as ShopProps)?.name ?? "") === name,
      );
      if (f) {
        setSelected(detailsFromProps(f.properties as Record<string, unknown>));
        const [lon, lat] = f.geometry.coordinates;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, duration: reduce ? 0 : 700 });
      }
      setMenuOpen(false);
    },
    [],
  );

  return (
    <TamaguiProvider config={config} defaultTheme={dark ? "dark" : "light"}>
      <TopBar
        ref={topbarEl}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        heat={heat}
        onToggleHeat={() => setHeat((h) => !h)}
        art={art}
        onToggleArt={() => setArt((a) => !a)}
        query={query}
        onQuery={setQuery}
        onlyIg={onlyIg}
        onOnlyIg={setOnlyIg}
        count={
          mapReady
            ? `${shown} de ${total} cafés`
            : status === "error"
              ? "sin datos"
              : "cargando…"
        }
        onOpenMenu={() => setMenuOpen((o) => !o)}
      />
      <div id="map" ref={mapEl} />
      <div id="paper" style={{ backgroundImage: `url(${BASE}styles/paper.png)` }} />
      <ShopCard details={selected} onClose={closeAll} />
      <ShopMenu
        open={menuOpen}
        names={names}
        onSelect={selectByName}
        onClose={() => setMenuOpen(false)}
      />
      <footer id="attrib" ref={footerEl}>
        Datos: © OpenStreetMap contributors (ODbL) · Google Maps · Instagram — Mapa: acuarela
        (estilo propio) sobre OpenFreeMap — <span>{generated}</span>
      </footer>
      <PwaBanner />
    </TamaguiProvider>
  );
}
