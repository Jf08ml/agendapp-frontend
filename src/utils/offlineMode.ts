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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useOfflineMode = (): OfflineSnapshot =>
  useSyncExternalStore(subscribe, getOfflineSnapshot);
