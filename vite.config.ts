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
      injectRegister: null,
    }),
  ],
  // server: {
  //   proxy: {
  //     // Proxy manifest y favicon al backend (ajusta el puerto si es necesario)
  //     "/manifest.webmanifest": "http://localhost:5000",
  //     "/favicon.ico": "http://localhost:5000",
  //   },
  // },
});
