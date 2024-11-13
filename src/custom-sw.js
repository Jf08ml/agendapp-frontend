import { precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { createHandlerBoundToURL } from "workbox-precaching";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// Inyección de manifiesto
precacheAndRoute(self.__WB_MANIFEST);

// Manejo de navegación para SPA
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/api\//], // Excluye cualquier ruta de la API o que no quieras manejar con el service worker
});
registerRoute(navigationRoute);

// Caching runtime para imágenes
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
      }),
    ],
  })
);

// Manejo de eventos push para notificaciones
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const { title, message } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: "/galaxia_glamour.png",
    })
  );
});

// Manejo de clic en las notificaciones
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
