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

  const map = new maplibregl.Map({
    container: "map",
    // Our own watercolor theme over OpenFreeMap vector tiles (OSM data):
    // free, keyless, no external style service. See src/watercolor.ts.
    style: watercolorStyle,
    center: [-117.0382, 32.5149],
    zoom: 12.4,
  });

  // hooks the smoke test drives
  (window as any).__map = map;
  (window as any).__shops = fc.features;

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
    map.addLayer({
      id: "shops",
      type: "circle",
      source: "shops",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6],
        "circle-color": ["case", ["has", "instagram"], "#c2410c", "#1d4ed8"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
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
