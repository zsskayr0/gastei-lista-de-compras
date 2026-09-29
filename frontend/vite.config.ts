import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Gastei — Lista de Compras",
        short_name: "Gastei",
        description: "Lista de compras compartilhada da família, local-first.",
        theme_color: "#3a0f24",
        background_color: "#FFF8FB",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // App shell só — dados sempre vêm do armazenamento local, nunca de cache de rede.
        globPatterns: ["**/*.{js,css,html,woff2,ttf,svg,png}"],
        // Fotos do catálogo: a URL leva ?v=<versão>, então cache eterno é seguro.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/media/"),
            handler: "CacheFirst" as const,
            options: {
              cacheName: "catalog-images",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
