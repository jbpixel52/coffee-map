/** Root island: the sheet, the signs, and the census. Owns the MapLibre instance. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point } from "geojson";
import { shopMatches, type ShopProps } from "../lib/filter";
import { applyPlanTheme, planStyle, HEAT_LIGHT, HEAT_NIGHT, PLAN } from "../lib/plan";
import { buildZones } from "../lib/zones";
import { detailsFromProps, type ShopDetails } from "../lib/details";
import TitleBar from "./TitleBar";
import ExpandableTabs from "./ExpandableTabs";
import ShopsPanel from "./ShopsPanel";
import SettingsPanel from "./SettingsPanel";
import Ficha from "./Ficha";
import type { ListShop } from "./StackedList";
import { Gear, Rows } from "./Icons";
import PwaBanner from "./PwaBanner";

const BASE = import.meta.env.BASE_URL;
const SOURCE = "shops";
/** Layer ids stay distinct from their source id: MapLibre silently drops a
 * layer whose id equals the source it reads from. */
const SHOPS = "shops-dots";
const SHOPS_GHOST = "shops-dots-dim";
const HEAT = "shops-heat";
const ZONES = "zones-heat";
const HEAT_OPACITY = 0.32;
const STORE_KEY = "coffee-map-night";

interface Meta {
  city?: string;
  cities?: Array<{ name: string; slug: string; shop_count: number }>;
  generated_at?: string;
}

type Selected = ShopDetails & { lon: number; lat: number };

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-MX"));

export default function MapApp() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const fcRef = useRef<FeatureCollection<Point> | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [cities, setCities] = useState<string[]>(["Tijuana"]);
  const [city, setCity] = useState<string | null>(null); // null = all cities
  const [generated, setGenerated] = useState("");
  const [query, setQuery] = useState("");
  const [onlyIg, setOnlyIg] = useState(false);
  const [heat, setHeat] = useState(false);
  const [night, setNight] = useState(
    () =>
      localStorage.getItem(STORE_KEY) === "1" ||
      (localStorage.getItem(STORE_KEY) === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );
  const [selected, setSelected] = useState<Selected | null>(null);
  const [tab, setTab] = useState<string | null>(null);

  /** Paint the dots for the current theme and filter state. */
  const paintDots = useCallback((map: maplibregl.Map, isNight: boolean) => {
    // Waterfall marks what we can show; a neutral Dolphin/Indigo mix is the
    // rest of the census; the stroke carries the contrast on both grounds.
    const hasIg = "#9b1b30"; // Chili Pepper, the accent
    const plain = isNight ? "#a6a093" : PLAN.inkFaint;
    const stroke = isNight ? "#f2eada" : PLAN.ink;
    if (map.getLayer(SHOPS_GHOST)) {
      map.setPaintProperty(SHOPS_GHOST, "circle-color", isNight ? "#a6a093" : PLAN.ink);
    }
    if (!map.getLayer(SHOPS)) return;
    map.setPaintProperty(SHOPS, "circle-color", [
      "case",
      ["has", "instagram"],
      hasIg,
      plain,
    ]);
    map.setPaintProperty(SHOPS, "circle-stroke-color", [
      "case",
      ["has", "instagram"],
      stroke,
      stroke,
    ]);
  }, []);

  // ── boot: data, map, layers, events ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    async function boot() {
      const [fc, meta] = await Promise.all([
        fetch(`${BASE}data/shops.geojson`).then((r) => r.json() as Promise<FeatureCollection<Point>>),
        fetch(`${BASE}data/meta.json`).then((r) => r.json() as Promise<Meta>),
      ]);
      if (cancelled || !mapEl.current) return;
      fcRef.current = fc;
      setTotal(fc.features.length);
      setShown(fc.features.length);
      setCities((meta.cities?.map((c) => c.name) ?? [meta.city ?? "Tijuana"]));
      if (meta.generated_at) {
        setGenerated(
          new Date(meta.generated_at).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        );
      }

      const params = new URLSearchParams(location.search);
      const ll = (params.get("ll") ?? "").split(",").map(Number);
      const zq = Number(params.get("z"));
      const cam =
        ll.length === 2 && ll.every(Number.isFinite) && Number.isFinite(zq)
          ? { center: [ll[0], ll[1]] as [number, number], zoom: zq }
          : { center: [-117.0382, 32.5149] as [number, number], zoom: 12.4 };

      map = new maplibregl.Map({
        container: mapEl.current,
        style: planStyle,
        center: cam.center,
        zoom: cam.zoom,
        attributionControl: false,
      });
      mapRef.current = map;
      map.on("error", (e) => {
        // Surface style/tile problems instead of leaving a silent pale sheet.
        // MapLibre drops a layer that fails validation without throwing, so
        // this list is the only evidence it happened.
        const log = ((window as unknown as Record<string, unknown>).__mapErrors ??= []) as string[];
        const message = (e as { error?: Error }).error?.message ?? String(e);
        log.push(message);
        console.error("map error:", message);
      });
      (window as unknown as Record<string, unknown>).__map = map;
      (window as unknown as Record<string, unknown>).__shops = fc.features;

      map.on("load", () => {
        if (!map) return;
        map.addSource(SOURCE, { type: "geojson", data: fc });

        // The census as two layers instead of one `case`: MapLibre allows only
        // one zoom interpolate per expression, and a filter is the idiomatic
        // way to split bright from dimmed anyway.
        map.addLayer({
          id: SHOPS_GHOST,
          type: "circle",
          source: SOURCE,
          filter: ["==", ["get", "dim"], true],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.6, 16, 3],
            "circle-color": PLAN.ink,
            "circle-opacity": 0.3,
          },
        });

        // yellow means "we can show you its Instagram"
        map.addLayer({
          id: SHOPS,
          type: "circle",
          source: SOURCE,
          filter: ["!=", ["get", "dim"], true],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.2, 16, 6],
            "circle-color": "#9b1b30",
            "circle-stroke-width": 1.3,
            "circle-stroke-color": PLAN.ink,
          },
        });

        map.addLayer({
          id: HEAT,
          type: "heatmap",
          source: SOURCE,
          filter: ["!=", ["get", "dim"], true],
          layout: { visibility: "none" },
          paint: {
            "heatmap-weight": ["coalesce", ["to-number", ["get", "ig_followers"]], 1],
            "heatmap-intensity": 0.7,
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 20, 34],
            "heatmap-color": HEAT_LIGHT,
            "heatmap-opacity": HEAT_OPACITY,
          },
        });

        map.addSource("zones", { type: "geojson", data: buildZones(fc) });
        map.addLayer({
          id: ZONES,
          type: "circle",
          source: "zones",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 26],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "zone_followers"],
              0, "rgba(58,176,162,0.10)",
              400, "rgba(58,176,162,0.20)",
              1500, "rgba(202,108,86,0.22)",
              5000, "rgba(155,27,48,0.26)",
            ],
            "circle-stroke-color": PLAN.ink,
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.18,
            "circle-opacity": 0.9,
          },
        });

        map.on("click", SHOPS, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const [lon, lat] = (f.geometry as Point).coordinates;
          const props = f.properties as Record<string, unknown>;
          setSelected({ ...detailsFromProps({ ...props, lat, lon }), lon, lat });
        });

        map.on("click", (e) => {
          if (!map) return;
          const hits = map.queryRenderedFeatures(e.point, { layers: [SHOPS] });
          if (hits.length === 0) {
            setSelected(null);
            markerRef.current?.remove();
            markerRef.current = null;
          }
        });

        paintDots(map, night);
        if (night) applyPlanTheme(map, true);
        map.getCanvas().style.cursor = "";
        setStatus("ready");
      });

      map.on("mouseenter", SHOPS, () => {
        if (map) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SHOPS, () => {
        if (map) map.getCanvas().style.cursor = "";
      });
    }

    boot().catch((err) => {
      console.error("boot failed", err);
      setStatus("error");
    });
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── sheet / noche ─────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("night", night);
    localStorage.setItem(STORE_KEY, night ? "1" : "0");
    const map = mapRef.current;
    if (map && status === "ready") {
      applyPlanTheme(map, night);
      paintDots(map, night);
    }
  }, [night, status, paintDots]);

  // ── calor ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const on = heat ? "visible" : "none";
    const off = heat ? "none" : "visible";
    for (const [id, vis] of [
      [HEAT, on],
      [ZONES, on],
      [SHOPS, off],
      [SHOPS_GHOST, off],
    ] as const) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
    if (map.getLayer(HEAT)) {
      map.setPaintProperty(HEAT, "heatmap-color", night ? HEAT_NIGHT : HEAT_LIGHT);
    }
  }, [heat, night, status]);

  // ── filters: nothing disappears, it dims ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const fc = fcRef.current;
    if (!map || status !== "ready" || !fc) return;
    let count = 0;
    const features = fc.features.map((f) => {
      const ok = shopMatches(f.properties as ShopProps, query, onlyIg, city);
      if (ok) count += 1;
      return { ...f, properties: { ...(f.properties as object), dim: !ok } };
    });
    setShown(count);
    (map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features,
    });
  }, [query, onlyIg, city, status]);

  // ── city selection frames the map ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const fc = fcRef.current;
    if (!map || status !== "ready" || !fc || !city) return;
    const feats = fc.features.filter((f) => (f.properties as ShopProps).city === city);
    if (feats.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const f of feats) bounds.extend((f.geometry as Point).coordinates as [number, number]);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 60, left: 60, right: 60 },
      maxZoom: 13.5,
      duration: reduce ? 0 : 900,
    });
  }, [city, status]);

  // ── the tag on the map ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!selected) return;
    const el = document.createElement("div");
    el.className = "tag";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `${selected.name}, ${fmt(selected.followers)} seguidores`);
    // static markup only — the name and count are filled with textContent below
    el.innerHTML = `<b></b><span></span>`;
    (el.querySelector("b") as HTMLElement).textContent = selected.name;
    (el.querySelector("span") as HTMLElement).textContent =
      selected.followers != null ? `${fmt(selected.followers)} seguidores` : "sin Instagram";
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
    });
    markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -10] })
      .setLngLat([selected.lon, selected.lat])
      .addTo(map);
  }, [selected, status]);

  // ── shareable view ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
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
  }, [status]);

  // ── keyboard ──────────────────────────────────────────────────────────
  const closeFicha = useCallback(() => {
    setSelected(null);
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeFicha();
        setTab(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeFicha]);

  // ── rail data ─────────────────────────────────────────────────────────
  const railShops: ListShop[] = (fcRef.current?.features ?? []).map((f) => {
    const p = f.properties as ShopProps;
    return {
      id: (p as unknown as { id: number }).id,
      name: p.name,
      handle: p.instagram ?? null,
      followers: p.ig_followers ?? null,
      city: p.city ?? null,
    };
  });

  const selectByName = useCallback((name: string) => {
    const fc = fcRef.current;
    const f = fc?.features.find((feat) => ((feat.properties as ShopProps)?.name ?? "") === name);
    if (!f) return;
    const [lon, lat] = (f.geometry as Point).coordinates;
    setSelected({ ...detailsFromProps({ ...(f.properties as object), lat, lon }), lon, lat });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, duration: reduce ? 0 : 800 });
  }, []);

  const tabs = [
    { id: "shops", label: "Cafés", icon: <Rows />, meta: `${total}` },
    { id: "settings", label: "Ajustes", icon: <Gear /> },
  ];

  return (
    <>
      <div id="map" ref={mapEl} />

      <div className="top-layer">
        <TitleBar cities={city ? [city] : cities} shown={shown} total={total} status={status} />
        <ExpandableTabs tabs={tabs} openId={tab} onOpen={setTab} />
      </div>

      {tab === "shops" && (
        <ShopsPanel
          shops={railShops}
          cities={cities}
          city={city}
          onCity={setCity}
          query={query}
          onQuery={setQuery}
          onlyIg={onlyIg}
          onOnlyIg={() => setOnlyIg((v) => !v)}
          shown={shown}
          total={total}
          selected={selected?.name ?? null}
          onSelect={selectByName}
          onClose={() => setTab(null)}
        />
      )}

      {tab === "settings" && (
        <SettingsPanel
          night={night}
          onNight={() => setNight((n) => !n)}
          heat={heat}
          onHeat={() => setHeat((h) => !h)}
          onClose={() => setTab(null)}
          generated={generated}
        />
      )}

      {selected && (
        <aside className="ficha-card" aria-label="Ficha del café">
          <Ficha details={selected} onClose={closeFicha} />
        </aside>
      )}

      <div className="credit-strip">
        <b>Datos</b> © OpenStreetMap ODbL · Google Maps · Instagram
        {generated ? <span>· {generated}</span> : null}
      </div>
      <PwaBanner />
      {status !== "ready" && (
        <div className={`loading${status === "error" ? " err" : ""}`} role="status">
          <div>
            <b>{status === "error" ? "Sin datos" : "Cafés de Tijuana"}</b>
            {status === "loading" ? <i /> : <p style={{ margin: 0, fontSize: 12 }}>Revisa tu conexión y recarga.</p>}
          </div>
        </div>
      )}
    </>
  );
}
