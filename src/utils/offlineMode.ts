import { useSyncExternalStore } from "react";

/**
 * Señal global de "sin conexión", alimentada por el resultado REAL de las
 * peticiones (no solo por navigator.onLine, que miente con wifi sin internet o
 * señal muerta: dice "online" y las requests igual se cuelgan).
 *
 * - markOffline(): una petición con caché de respaldo falló por red.
 * - markLive():    una petición llegó al servidor. Si veníamos offline, sube
 *                  `recoveries` para que las pantallas vuelvan a pedir sus datos.
 */
export interface OfflineSnapshot {
  offline: boolean;
  recoveries: number;
}

let snapshot: OfflineSnapshot = {
  offline: typeof navigator !== "undefined" && navigator.onLine === false,
  recoveries: 0,
};
const listeners = new Set<() => void>();

const publish = (next: OfflineSnapshot) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const markOffline = () => {
  if (!snapshot.offline) publish({ ...snapshot, offline: true });
};

export const markLive = () => {
  if (snapshot.offline) {
    publish({ offline: false, recoveries: snapshot.recoveries + 1 });
  }
};

export const getOfflineSnapshot = () => snapshot;

/**
 * Un fallo "sin respuesta" NO prueba que estemos offline: un timeout del servidor
 * (p. ej. el 504 de Vercel, que llega sin cabeceras CORS) o una consulta muy lenta
 * el navegador los reporta igual que una red caída. Antes de declarar "sin
 * conexión" se confirma con una petición liviana; si el servidor contesta, el
 * problema es de esa consulta y no de la conexión.
 *
 * La sonda se registra desde axiosConfig.ts (aquí no se importa axios: evita un
 * ciclo de imports y deja este módulo sin dependencias).
 */
let reachabilityProbe: (() => Promise<boolean>) | null = null;
let probing: Promise<boolean> | null = null;

export const setReachabilityProbe = (probe: () => Promise<boolean>) => {
  reachabilityProbe = probe;
};

/** ¿Responde el servidor? Comparte una sola sonda entre fallos simultáneos. */
export const isServerReachable = (): Promise<boolean> => {
  if (!reachabilityProbe) return Promise.resolve(false);
  if (!probing) {
    probing = reachabilityProbe()
      .catch(() => false)
      .finally(() => {
        probing = null;
      });
  }
  return probing;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useOfflineMode = (): OfflineSnapshot =>
  useSyncExternalStore(subscribe, getOfflineSnapshot);
