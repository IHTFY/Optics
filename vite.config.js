import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

const icons = [192, 512].map((size) => ({
  src: `/images/icons/icon-${size}x${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
}));

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Optics",
        short_name: "Optics",
        description: "Optics: a game based on the Illusion card game",
        id: "/",
        start_url: "/",
        display: "standalone",
        background_color: "#202125",
        theme_color: "#202125",
        icons,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
