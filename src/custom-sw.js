import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { createHandlerBoundToURL } from "workbox-precaching";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from 'workbox-core';

// Version del SW basada en timestamp
const SW_VERSION = new Date().getTime();

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

console.log('[SW] Service Worker Version:', SW_VERSION);

// Inyección de manifiesto (SOLO UNA REFERENCIA A self.__WB_MANIFEST)
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
  const { title, message, icon } = data; 

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: icon || "/logo_default.png",
    })
  );

  // Notificar a los clientes abiertos
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: "NEW_NOTIFICATION",
        payload: data,
      });
    });
  });
});


// Manejo de clic en las notificaciones
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

// Comunicación con el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
