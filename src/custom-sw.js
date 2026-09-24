import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from 'workbox-core';

// Version del SW basada en timestamp
const SW_VERSION = new Date().getTime();

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

console.log('[SW] Service Worker Version:', SW_VERSION);

// Inyección de manifiesto (SOLO UNA REFERENCIA A self.__WB_MANIFEST)
precacheAndRoute(self.__WB_MANIFEST);

// PayPal y dominios de pago: siempre ir a la red, nunca usar caché.
// El SDK de PayPal abre popups/iframes y requiere cookies de terceros;
// cualquier intercepción del SW rompe el flujo de autenticación en PWA.
registerRoute(
  ({ url }) =>
    url.hostname.endsWith("paypal.com") ||
    url.hostname.endsWith("paypalobjects.com") ||
    url.hostname.endsWith("paypal.me"),
  new NetworkOnly()
);

// Manejo de navegación para SPA - NetworkFirst para siempre obtener HTML fresco
// Solo usa caché como fallback cuando está offline
const navigationStrategy = new NetworkFirst({
  cacheName: "navigation-cache",
  networkTimeoutSeconds: 3,
});
const navigationRoute = new NavigationRoute(
  async ({ request, event }) => {
    try {
      return await navigationStrategy.handle({ request, event });
    } catch (error) {
      // Sin red y sin esa URL en navigation-cache (p. ej. recargar la app estando
      // en /gestionar-agenda: solo "/" se pidió como navegación completa). Se
      // devuelve el shell precacheado y el router del cliente resuelve la ruta,
      // así la agenda guardada puede abrirse sin conexión.
      const shell = await matchPrecache("/index.html");
      if (shell) return shell;
      throw error;
    }
  },
  {
    denylist: [/^\/api\//],
  }
);
registerRoute(navigationRoute);

// Fuentes de Google: el CSS es render-blocking (<link rel="stylesheet"> en index.html);
// sin copia local, con señal colgada el primer render espera a que el navegador se
// rinda, y sin red la app se ve con fuentes del sistema. Receta estándar de Workbox.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-styles",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-files",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

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
