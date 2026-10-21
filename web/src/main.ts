import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point } from "geojson";
import { shopMatches, type ShopProps, foldName } from "./filter";
import { popupHtml } from "./popup";
import { watercolorStyle } from "./watercolor";
import "./style.css";

const BASE = import.meta.env.BASE_URL;

async function boot() {
  const [fc, meta] = await Promise.all([
    fetch(`${BASE}data/shops.geojson`).then((r) => r.json() as Promise<FeatureCollection<Point>>),
    fetch(`${BASE}data/meta.json`).then((r) => r.json()),
  ]);

  const params = new URLSearchParams(location.search);
  const ll = (params.get("ll") ?? "").split(",").map(Number);
  const zq = Number(params.get("z"));
  const cam =
    ll.length === 2 && ll.every(Number.isFinite) && Number.isFinite(zq)
      ? { center: [ll[0], ll[1]] as [number, number], zoom: zq }
      : { center: [-117.0382, 32.5149] as [number, number], zoom: 12.4 };

  const map = new maplibregl.Map({
    container: "map",
    style: watercolorStyle,
    center: cam.center,
    zoom: cam.zoom,
  });

  (window as any).__map = map;
  (window as any).__shops = fc.features;

  const paperEl = document.getElementById("paper") as HTMLElement;
  paperEl.style.backgroundImage = `url(${BASE}styles/paper.png)`;
  const mapEl = document.getElementById("map") as HTMLElement;
  mapEl.classList.add("moving");
  map.on("movestart", () => mapEl.classList.add("moving"));
  map.on("zoomstart", () => mapEl.classList.add("moving"));
  map.on("idle", () => mapEl.classList.remove("moving"));

  // ── Dark‑mode toggle ──
  const darkBtn = document.getElementById("dark-btn") as HTMLButtonElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) document.documentElement.classList.add("dark");
  darkBtn.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });

  // ── Shop dropdown ──
  const ddBtn = document.getElementById("shop-dd-btn") as HTMLButtonElement;
  const ddList = document.getElementById("shop-dd-list") as HTMLUListElement;
  const ddSearch = document.getElementById("shop-dd-search") as HTMLInputElement;
  const ddMenu = document.getElementById("shop-dd") as HTMLElement;
  const shops = fc.features.map((f: any) => f.properties.name ?? "Desconocido");
  const buildList = (filter = "") => {
    const normalized = foldName(filter);
    ddList.innerHTML = shops
      .filter((name: string) => foldName(name).includes(normalized) || name.toLowerCase().includes(filter.toLowerCase()))
      .map((name: string) => `<li${name === (ddSearch.defaultValue ?? "") ? " class='selected'" : ""}>${name}</li>`)
      .join("");
  };
  ddBtn.addEventListener("click", () => ddMenu.classList.toggle("hidden"));
  ddSearch.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement | null;
    if (target) buildList(target.value);
  });
  document.addEventListener("click", (e) => {
    const target = e.target as Node | null;
    if (!ddBtn.contains(target) && !ddList.contains(target)) {
      ddMenu.classList.add("hidden");
    }
  });

  const popupFor = (f: Feature<Point>) => {
    const p = f.properties as Record<string, any> & ShopProps;
    const [lon, lat] = f.geometry.coordinates;
    return new maplibregl.Popup({ maxWidth: "340px" })
      .setLngLat([lon, lat])
      .setHTML(popupHtml({ ...(p as any), lat, lon }));
  };

  const applyFilters = () => {
    const q = (document.getElementById("q") as HTMLInputElement).value;
    const onlyIg = (document.getElementById("only-ig") as HTMLInputElement).checked;
    const shown = fc.features.filter((f) => shopMatches(f.properties as ShopProps, q, onlyIg));
    (document.getElementById("count") as HTMLElement).textContent = `${shown.length} de ${fc.features.length} cafés`;
    (map.getSource("shops") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: shown,
    });
    return shown.length;
  };
  (window as any).__applyFilters = applyFilters;

  // ── Right sidebar: TikTok search ──
  const sidebar = document.getElementById("sidebar") as HTMLElement;
  const sidebarClose = document.getElementById("sidebar-close") as HTMLButtonElement;
  const sidebarTitle = document.getElementById("sidebar-title") as HTMLElement;
  const tiktokEmbed = document.getElementById("tiktok-embed") as HTMLIFrameElement;

  map.on("load", () => {
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
    map.on("click", "shops", (e) => {
      const f = e.features?.[0];
      if (f) popupFor(f as unknown as Feature<Point>).addTo(map);
    });

    // TikTok sidebar handlers
    map.on("click", "shops", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, any> & ShopProps;
      sidebarTitle.textContent = `TikTok: ${p.name || "Café"}`;
      const query = encodeURIComponent(p.name || "");
      tiktokEmbed.src = `https://www.tiktok.com/search?q=${query}`;
      sidebar.classList.remove("hidden");
    });
    sidebarClose.addEventListener("click", () => {
      sidebar.classList.add("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!sidebar.contains(e.target as Node) && e.target !== ddBtn) {
        sidebar.classList.add("hidden");
      }
    });
  });

  applyFilters();
  (document.getElementById("generated") as HTMLElement).textContent = `actualizado ${meta.generated_at}`;
}

boot();