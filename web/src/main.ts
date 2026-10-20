import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point } from "geojson";
import { shopMatches, type ShopProps } from "./filter";
import { watercolorStyle } from "./watercolor";
import "./style.css";

const BASE = import.meta.env.BASE_URL;

async function boot() {
  const [fc, meta] = await Promise.all([
    fetch(`${BASE}data/shops.geojson`).then((r) => r.json() as Promise<FeatureCollection<Point>>),
    fetch(`${BASE}data/meta.json`).then((r) => r.json()),
  ]);

  // QA/screenshot hook: ?z=<zoom>&ll=<lon>,<lat> sets the initial camera
  // (lets headless shots skip a mid-run jumpTo, which is crash-prone under
  // software GL in constrained environments)
  const params = new URLSearchParams(location.search);
  const ll = (params.get("ll") ?? "").split(",").map(Number);
  const zq = Number(params.get("z"));
  const cam =
    ll.length === 2 && ll.every(Number.isFinite) && Number.isFinite(zq)
      ? { center: [ll[0], ll[1]] as [number, number], zoom: zq }
      : { center: [-117.0382, 32.5149] as [number, number], zoom: 12.4 };

  const map = new maplibregl.Map({
    container: "map",
    // Our own watercolor theme over OpenFreeMap vector tiles (OSM data):
    // free, keyless, no external style service. See src/watercolor.ts.
    style: watercolorStyle,
    center: cam.center,
    zoom: cam.zoom,
  });

  // hooks the smoke test drives
  (window as any).__map = map;
  (window as any).__shops = fc.features;

  // paper overlay asset + painted-at-rest filter toggling
  const paperEl = document.getElementById("paper") as HTMLElement;
  paperEl.style.backgroundImage = `url(${BASE}styles/paper.png)`;
  const mapEl = document.getElementById("map") as HTMLElement;
  // start crisp: the first paint loop loads tiles and repaints constantly,
  // and re-running the SVG filter per frame is the expensive case. The
  // painted look kicks in on the first idle and returns whenever motion stops.
  mapEl.classList.add("moving");
  map.on("movestart", () => mapEl.classList.add("moving"));
  map.on("zoomstart", () => mapEl.classList.add("moving"));
  map.on("idle", () => mapEl.classList.remove("moving"));

  const popupFor = (f: Feature<Point>) => {
    const p = f.properties as Record<string, any> & ShopProps;
    const [lon, lat] = f.geometry.coordinates;
    const gm = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.name} ${lat},${lon}`,
    )}`;
    const ig = p.instagram
      ? `<a href="https://instagram.com/${p.instagram}" target="_blank" rel="noopener">@${p.instagram}</a>` +
        (p.ig_followers ? ` · ${p.ig_followers} seguidores` : "")
      : "—";
    return new maplibregl.Popup().setLngLat([lon, lat]).setHTML(
      `<strong>${p.name}</strong><br/>IG: ${ig}<br/>` +
        `<a href="${gm}" target="_blank" rel="noopener">Google Maps</a>`,
    );
  };

  const applyFilters = () => {
    const q = (document.getElementById("q") as HTMLInputElement).value;
    const onlyIg = (document.getElementById("only-ig") as HTMLInputElement).checked;
    const shown = fc.features.filter((f) => shopMatches(f.properties as ShopProps, q, onlyIg));
    (document.getElementById("count") as HTMLElement).textContent =
      `${shown.length} de ${fc.features.length} cafés`;
    (map.getSource("shops") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: shown,
    });
    return shown.length;
  };
  (window as any).__applyFilters = applyFilters;

  map.on("load", () => {
    map.addSource("shops", { type: "geojson", data: fc });
    // soft bloom under the dots so markers read painted, not printed
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
      if (e.features?.[0]) popupFor(e.features[0] as unknown as Feature<Point>).addTo(map);
    });
    applyFilters();
  });

  document.getElementById("q")!.addEventListener("input", applyFilters);
  document.getElementById("only-ig")!.addEventListener("change", applyFilters);
  (document.getElementById("generated") as HTMLElement).textContent =
    `actualizado ${meta.generated_at}`;
}

boot();
