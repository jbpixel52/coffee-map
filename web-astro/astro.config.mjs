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
  },
});
