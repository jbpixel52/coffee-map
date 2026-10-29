import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Site is served from https://jbpixel52.github.io/coffee-map/ on GitHub Pages.
export default defineConfig({
  site: "https://jbpixel52.github.io",
  base: "/coffee-map/",
  integrations: [react()],
  vite: {
    define: {
      // Tamagui web target constant (compile-time flag it expects).
      "process.env.TAMAGUI_TARGET": JSON.stringify("web"),
    },
    build: {
      rollupOptions: {
        output: {
          // MapLibre is 1.1 MB of the single island chunk and changes only when we bump
          // the dependency; splitting it lets the shell parse first and keeps the big
          // file cached across deploys that only touch UI code.
          manualChunks(id) {
            return id.includes("node_modules/maplibre-gl") ? "maplibre" : undefined;
          },
        },
      },
    },
  },
});
