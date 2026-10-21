import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point } from "geojson";
import { shopMatches, type ShopProps, foldName } from "./filter";
import { popupHtml, instagramEmbedUrl, gmapsSearchUrl, escapeHtml } from "./popup";
import { watercolorStyle, applyMapTheme, HEAT_COLORS_LIGHT, type MapInstance } from "./watercolor";
import "./style.css";

const BASE = import.meta.env.BASE_URL;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
}

interface ShopDetails {
  name: string;
  fullName?: string | null;
  handle?: string | null;
  followers?: number | null;
  code?: string | null;
  lat?: number | null;
  lon?: number | null;
}

function detailsFromProps(p: any): ShopDetails {
  if (!p || typeof p !== "object") return { name: "Desconocido" };
  return {
    name: p.name || "Desconocido",
    fullName: p.ig_full_name ?? null,
    handle: (p.instagram || "").trim() || null,
    followers:
      typeof p.ig_followers === "number" && p.ig_followers > 0 ? p.ig_followers : null,
    code: p.ig_latest_code ?? null,
    lat: p.lat,
    lon: p.lon,
  };
}

/** Cluster shops into zones by simple grid bucketing. Returns zone centroids
 * with aggregate follower counts so the heatmap can be weighted per-zone. */
function buildZones(fc: FeatureCollection<Point>): FeatureCollection<Point> {
  const ZONE_SIZE = 0.018; // ~2 km at this latitude
  const buckets = new Map<string, { lon: number; lat: number; followers: number; count: number }>();
  for (const f of fc.features) {
    if (!f.geometry || f.geometry.type !== "Point") continue;
    const [lon, lat] = f.geometry.coordinates;
    const key = `${Math.floor(lon / ZONE_SIZE)},${Math.floor(lat / ZONE_SIZE)}`;
    const b = buckets.get(key) ?? { lon: 0, lat: 0, followers: 0, count: 0 };
    b.lon += lon;
    b.lat += lat;
    b.followers += (f.properties as any)?.ig_followers ?? 0;
    b.count += 1;
    buckets.set(key, b);
  }
  const features: Feature<Point>[] = [];
  for (const b of buckets.values()) {
    const followers = b.followers;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.lon / b.count, b.lat / b.count] },
      properties: { zone_followers: followers, zone_shops: b.count },
    });
  }
  return { type: "FeatureCollection", features };
}

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

  // Measure topbar and footer heights to position map and sidebars exactly.
  const setLayout = () => {
    const topbar = document.getElementById("topbar") as HTMLElement | null;
    const footer = document.getElementById("attrib") as HTMLElement | null;
    const topbarH = topbar?.offsetHeight ?? 68;
    const footerH = footer?.offsetHeight ?? 44;
    const topOffset = 12 + topbarH + 8; // top:12 + topbarH + gap
    document.documentElement.style.setProperty("--topbar-h", `${topbarH}px`);
    document.documentElement.style.setProperty("--footer-h", `${footerH}px`);
    document.documentElement.style.setProperty("--map-top", `${topOffset}px`);
  };

  // Initial layout (may be called after first paint).
  setLayout();
  // Update on resize.
  window.addEventListener("resize", setLayout);


  // ── Dark‑mode toggle (applies dark paint to the map itself) ──
  const darkBtn = document.getElementById("dark-btn") as HTMLButtonElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let dark = prefersDark;
  if (dark) document.documentElement.classList.add("dark");
  darkBtn.addEventListener("click", () => {
    dark = !dark;
    document.documentElement.classList.toggle("dark");
    applyMapTheme(map, dark);
  });
  // Honor system preference changes even after boot.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    dark = e.matches;
    document.documentElement.classList.toggle("dark", dark);
    applyMapTheme(map, dark);
  });

  // When the watercolor raster/vector style finishes loading, apply the dark
  // theme if either the user is already in dark mode or the OS prefers it.
  map.once("load", () => {
    if (dark) applyMapTheme(map, true);
  });

  // ── Heatmap toggle ──
  const heatBtn = document.getElementById("heat-btn") as HTMLButtonElement;
  let heatmapOn = false;
  heatBtn.addEventListener("click", () => {
    heatmapOn = !heatmapOn;
    heatBtn.classList.toggle("active", heatmapOn);
    heatBtn.setAttribute("aria-pressed", heatmapOn ? "true" : "false");
    const heatVis = heatmapOn ? "visible" : "none";
    const spotVis = heatmapOn ? "none" : "visible";
    // Heatmap layer
    if (map.getLayer("shops-heat")) {
      map.setLayoutProperty("shops-heat", "visibility", heatVis);
    }
    // Point layers
    if (map.getLayer("shops")) {
      map.setLayoutProperty("shops", "visibility", spotVis);
    }
    if (map.getLayer("shops-halo")) {
      map.setLayoutProperty("shops-halo", "visibility", spotVis);
    }
    // Zone cluster layer — shown with the heatmap
    if (map.getLayer("zones-heat")) {
      map.setLayoutProperty("zones-heat", "visibility", heatVis);
    }
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
      .filter(
        (name: string) =>
          foldName(name).includes(normalized) || name.toLowerCase().includes(filter.toLowerCase())
      )
      .map(
        (name: string) =>
          `<li${name === (ddSearch.defaultValue ?? "") ? " class='selected'" : ""}>${name}</li>`
      )
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

  // ── Left sidebar: shop detail (Google Maps style) ──
  const leftSidebar = document.getElementById("left-sidebar") as HTMLElement;
  const leftClose = document.getElementById("left-sidebar-close") as HTMLButtonElement;
  const leftTitle = document.getElementById("left-sidebar-title") as HTMLElement;
  const leftContent = document.getElementById("left-sidebar-content") as HTMLElement;

  const rightSidebar = document.getElementById("sidebar") as HTMLElement;
  const rightClose = document.getElementById("sidebar-close") as HTMLButtonElement;
  const tiktokEmbed = document.getElementById("tiktok-embed") as HTMLIFrameElement;

  const openLeft = (details: ShopDetails) => {
    leftTitle.textContent = details.name;
    const html: string[] = [];
    html.push(`<div class="shop-header">`);
    html.push(`<div class="shop-name">${escapeHtml(details.name)}</div>`);
    if (details.fullName && foldName(details.fullName) !== foldName(details.name)) {
      html.push(`<div class="shop-fullname">${escapeHtml(details.fullName)}</div>`);
    }
    html.push(`</div>`);

    if (details.handle) {
      const followers = details.followers
        ? ` <span class="shop-followers">· ${details.followers} seguidores</span>`
        : "";
      html.push(`<span class="shop-handle">@${escapeHtml(details.handle)}${followers}</span>`);
      html.push(
        `<div class="shop-links">` +
          `<a class="shop-link ig" href="https://www.instagram.com/${encodeURIComponent(
            details.handle
          )}/" target="_blank" rel="noopener">Instagram ↗</a>` +
          `<a class="shop-link gmaps" href="${gmapsSearchUrl(
            details.name,
            details.lat,
            details.lon
          )}" target="_blank" rel="noopener">Google Maps ↗</a>` +
          `</div>`
      );
      const embed = instagramEmbedUrl(details.code);
      if (embed) {
        html.push(`<iframe class="shop-embed" src="${embed}" loading="lazy" allowfullscreen scrolling="no"></iframe>`);
      }
    } else {
      html.push(`<span class="shop-no-ig">Sin Instagram conocido</span>`);
      html.push(
        `<a class="shop-link gmaps" href="${gmapsSearchUrl(details.name, details.lat, details.lon)}" target="_blank" rel="noopener">Google Maps ↗</a>`
      );
    }
    leftContent.innerHTML = html.join("");
    leftSidebar.classList.add("open");
  };

  const closeSidebars = () => {
    leftSidebar.classList.remove("open");
    rightSidebar.classList.remove("open");
  };

  leftClose.addEventListener("click", () => leftSidebar.classList.remove("open"));
  rightClose.addEventListener("click", () => rightSidebar.classList.remove("open"));
  leftSidebar.addEventListener("click", (e) => {
    // clicking the backdrop/close area outside the content closes it; the
    // close button itself already does. We only close when target is the shell.
    if (e.target === leftSidebar) leftSidebar.classList.remove("open");
  });

  const popupFor = (f: Feature<Point>) => {
    const p = f.properties as Record<string, any> & ShopProps;
    const [lon, lat] = f.geometry.coordinates;
    return new maplibregl.Popup({ maxWidth: "340px" })
      .setLngLat([lon, lat])
      .setHTML(popupHtml({ ...p, lat, lon }));
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
    // Heatmap layer — weighted by followers; hidden by default.
    map.addLayer({
      id: "shops-heat",
      type: "heatmap",
      source: "shops",
      layout: {
        "visibility": "none",
      },
      paint: {
        // Per-feature weight: use ig_followers if present, else 1.
        "heatmap-weight": ["coalesce", ["to-number", ["get", "ig_followers"]], 1],
        "heatmap-intensity": 0.7,
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 15, 20, 30],
        "heatmap-color": HEAT_COLORS_LIGHT,
        "heatmap-opacity": 0.7,
      },
    });

    // Zone cluster layer — discrete circles at zone centroids, sized by
    // aggregate followers, colored cold→hot. Hidden by default; shown when
    // heatmap is ON to give a per-zone gradient view.
    const zonesFc = buildZones(fc);
    map.addSource("zones", { type: "geojson", data: zonesFc });
    map.addLayer({
      id: "zones-heat",
      type: "circle",
      source: "zones",
      layout: { visibility: "none" },
      paint: {
        // Radius scales with follower count in zone.
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 14, 16],
        // Color gradient from cold (blue) to hot (red) based on zone_followers.
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "zone_followers"],
          0,
          "rgba(33,102,172,0.4)",
          100,
          "rgba(103,169,207,0.5)",
          500,
          "rgba(209,229,240,0.6)",
          2000,
          "rgba(253,174,97,0.7)",
          5000,
          "rgba(239,59,44,0.85)",
        ],
        "circle-opacity": 0.85,
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
      },
    });

    map.on("click", "shops", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, any> & ShopProps;
      openLeft(detailsFromProps(p));
      // right sidebar: TikTok search for the same shop
      const tiktokTitle = document.getElementById("sidebar-title") as HTMLElement;
      tiktokTitle.textContent = `TikTok: ${p.name || "Café"}`;
      const query = encodeURIComponent(p.name || "");
      tiktokEmbed.src = `https://www.tiktok.com/search?q=${query}`;
      rightSidebar.classList.add("open");
    });

    map.on("click", "shops-halo", (e) => {
      // let the shops layer handle it
    });

    map.on("click", (e) => {
      // Clicking empty map space closes the sidebars.
      const tgt = e.originalEvent?.target as Element | null | undefined;
      if (tgt && typeof tgt.closest === "function") {
        if (!tgt.closest(".left-sidebar") && !tgt.closest(".right-sidebar")) {
          closeSidebars();
        }
      }
    });

    // Apply the initial theme now that user-added layers exist (the once("load")
    // handler above ran before these were added).
    if (dark) applyMapTheme(map, true);
  });

  // Dropdown list item click → open left sidebar for that shop
  ddList.addEventListener("click", (e) => {
    const li = (e.target as Element).closest?.("li") as HTMLLIElement | null;
    if (!li) return;
    const name = li.textContent?.trim();
    if (!name) return;
    const f = fc.features.find((feat: any) => (feat.properties.name ?? "") === name);
    if (f) openLeft(detailsFromProps(f.properties));
    ddMenu.classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    const target = e.target as Node | null;
    if (!ddBtn.contains(target) && !ddList.contains(target)) {
      ddMenu.classList.add("hidden");
    }
  });

  // ── PWA install banner ──
  let deferredPrompt: any = null;
  const banner = document.getElementById("pwa-install") as HTMLElement | null;
  const installBtn = document.getElementById("pwa-install-yes") as HTMLButtonElement | null;
  const dismissBtn = document.getElementById("pwa-install-no") as HTMLButtonElement | null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner && !localStorage.getItem("pwa-dismissed")) {
      banner.classList.add("show");
    }
  });
  installBtn?.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        banner?.classList.remove("show");
        localStorage.setItem("pwa-dismissed", "1");
      }
      deferredPrompt = null;
    }
  });
  dismissBtn?.addEventListener("click", () => {
    banner?.classList.remove("show");
    localStorage.setItem("pwa-dismissed", "1");
  });

  applyFilters();
  (document.getElementById("generated") as HTMLElement).textContent = `actualizado ${meta.generated_at}`;
}

boot();