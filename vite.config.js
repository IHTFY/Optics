import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

const icons = [128, 144, 152, 192, 256, 512].map((size) => ({
  src: `/images/icons/icon-${size}x${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
}));

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.png", "images/icons/*.png"],
      manifest: {
        name: "Optics",
        short_name: "Optics",
        description: "Optics: a game based on the Illusion card game",
        start_url: "/",
        display: "standalone",
        background_color: "#202125",
        theme_color: "#202125",
        icons,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
