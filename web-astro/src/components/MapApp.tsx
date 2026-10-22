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
import TopBar from "./TopBar";
import ShopCard from "./ShopCard";
import ShopMenu from "./ShopMenu";
import PwaBanner from "./PwaBanner";

const BASE = import.meta.env.BASE_URL;

/** More translucent than the old 0.7 — heat should tint the map, not paint over it. */
const HEAT_OPACITY = 0.4;

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

  const [mapReady, setMapReady] = useState(false);
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

  // ── Boot: fetch data, create map, wire layers + events (once) ──
  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    async function boot() {
      const [fc, meta] = await Promise.all([
        fetch(`${BASE}data/shops.geojson`).then(
          (r) => r.json() as Promise<FeatureCollection<Point>>,
        ),
        fetch(`${BASE}data/meta.json`).then((r) => r.json() as Promise<Meta>),
      ]);
      if (cancelled || !mapEl.current) return;
      fcRef.current = fc;
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
            "heatmap-intensity": 0.7,
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
            "circle-opacity": 0.85,
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
            setSelected(null);
            popupRef.current?.remove();
            popupRef.current = null;
          }
        });

        setMapReady(true);
      });
    }

    boot().catch((err) => console.error("boot failed", err));
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
    if (map && mapReady) applyMapTheme(map, dark);
  }, [dark, mapReady]);

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
        mapRef.current?.flyTo({ center: [lon, lat], zoom: 15 });
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
        query={query}
        onQuery={setQuery}
        onlyIg={onlyIg}
        onOnlyIg={setOnlyIg}
        count={mapReady ? `${shown} de ${total} cafés` : ""}
        onOpenMenu={() => setMenuOpen((o) => !o)}
      />
      <div id="map" ref={mapEl} />
      <div id="paper" style={{ backgroundImage: `url(${BASE}styles/paper.png)` }} />
      <ShopCard details={selected} onClose={() => setSelected(null)} />
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
