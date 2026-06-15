import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "custom-sw.js",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB (el bundle principal supera 3 MB)
      },
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      manifest: false,
      // manifest: {
      //   name: "Estudio Rosa",
      //   short_name: "Estudio Rosa",
      //   description: "Estudio Rosa nails and lashes",
      //   display: "standalone",
      //   start_url: "/",
      //   background_color: "#ffffff",
      //   theme_color: "#ffffff",
      //   icons: [
      //     {
      //       src: "estudio_rosa.png",
      //       sizes: "192x192",
      //       type: "image/png",
      //     },
      //     {
      //       src: "estudio_rosa.png",
      //       sizes: "512x512",
      //       type: "image/png",
      //     },
      //     {
      //       src: "estudio_rosa.png",
      //       sizes: "512x512",
      //       type: "image/png",
      //       purpose: "any maskable",
      //     },
      //   ],
      // },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split conservador: separa solo librerías pesadas en sus propios chunks.
        // React + Redux + Router quedan juntos en "vendor" para evitar problemas
        // de orden de inicialización.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@mantine")) return "mantine";
          if (id.includes("recharts") || id.includes("/d3-")) return "charts";
          if (id.includes("@dnd-kit") || id.includes("@hello-pangea")) return "dnd";
          if (id.includes("@tabler/icons-react")) return "icons";
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true, // expone en 0.0.0.0 para cloudflared / túneles
  },
});
