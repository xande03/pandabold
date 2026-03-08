import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "panda-icon-192.png", "panda-icon-512.png"],
      manifest: {
        name: "Panda Bold - Plataforma de IA Multimodal",
        short_name: "Panda Bold",
        description: "Plataforma completa de IA: chat, imagens, vídeos, QR codes e música.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#ea580c",
        icons: [
          { src: "/panda-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/panda-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/panda-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
