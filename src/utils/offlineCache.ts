import axios from "axios";
import {
  getOfflineSnapshot,
  isServerReachable,
  markLive,
  markOffline,
} from "./offlineMode";

/**
 * Caché local (IndexedDB) para poder consultar la agenda sin conexión. Es de SOLO
 * LECTURA: guarda la última respuesta buena de cada recurso y la sirve únicamente
 * cuando la petición falla por red.
 *
 * Privacidad: cada entrada queda atada al usuario que la guardó ("owner") y solo
 * se devuelve a ese mismo usuario; además se borra todo al cerrar sesión
 * (ver clearOfflineCache y store.ts). Los datos de citas se guardan YA filtrados
 * por permisos (un profesional sin "ver todas" solo guarda las suyas).
 */

const DB_NAME = "agenditapp-offline";
const STORE = "cache";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

/**
 * Tope de espera de la petición en vivo. Sin él, con señal "muerta" (wifi sin
 * internet) axios espera lo que tarde el navegador en rendirse. Es generoso a
 * propósito: con copia guardada el usuario ya ve su agenda mucho antes (ver
 * SHOW_COPY_AFTER_MS), así que esto solo decide cuánto se espera una consulta
 * lenta antes de darla por fallida.
 */
export const OFFLINE_FETCH_TIMEOUT_MS = 20_000;

/** "user": solo el usuario que lo guardó. "public": datos públicos del dominio. */
type Scope = "user" | "public";

export interface CacheEntry<T> {
  owner: string;
  cachedAt: number;
  data: T;
}

export interface OfflineResult<T> {
  data: T;
  /** null = datos en vivo; número = timestamp en que se guardó la copia servida */
  cachedAt: number | null;
  /**
   * Solo si se sirvió la copia porque la respuesta en vivo tardaba: esa petición,
   * todavía en curso. Resuelve con los datos frescos (o rechaza si falla).
   */
  pending?: Promise<T>;
}

const ownerFor = (scope: Scope): string => {
  if (scope === "public") return "public";
  try {
    return localStorage.getItem("app_userId") || "anon";
  } catch {
    return "anon";
  }
};

/** Clave de la agenda de un mes (monthStartIso = startOfMonthInTimezone) */
export const agendaMonthKey = (organizationId: string, monthStartIso: string) =>
  `agenda:${organizationId}:${monthStartIso}`;

/**
 * ¿La petición falló por red (sin respuesta del servidor)? Incluye timeouts.
 * Un 4xx/5xx NO cuenta: el servidor respondió y eso no es "estar offline".
 * handleAxiosError marca `isNetworkError` porque relanza un Error plano.
 */
export const isNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) return !error.response;
  return (error as { isNetworkError?: boolean } | null)?.isNetworkError === true;
};

// ---------- IndexedDB (mínimo, sin dependencias) ----------

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB no disponible"));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Si falló (modo privado, etc.) permitir reintentar en la próxima llamada
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
};

const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

// Borra entradas viejas una vez por sesión, sin bloquear nada
let pruned = false;
const pruneExpired = async () => {
  try {
    const db = await openDb();
    const cutoff = Date.now() - MAX_AGE_MS;
    const request = db
      .transaction(STORE, "readwrite")
      .objectStore(STORE)
      .openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if ((cursor.value as CacheEntry<unknown>).cachedAt < cutoff) {
        cursor.delete();
      }
      cursor.continue();
    };
  } catch {
    // best-effort
  }
};

// ---------- API pública (nunca lanza: sin IndexedDB la app sigue en línea) ----------

export const cacheGet = async <T>(
  key: string,
  scope: Scope = "user"
): Promise<CacheEntry<T> | null> => {
  try {
    const entry = await run<CacheEntry<T> | undefined>("readonly", (store) =>
      store.get(key)
    );
    if (!entry || entry.owner !== ownerFor(scope)) return null;
    return entry;
  } catch {
    return null;
  }
};

export const cacheSet = async <T>(
  key: string,
  data: T,
  scope: Scope = "user"
): Promise<void> => {
  try {
    const entry: CacheEntry<T> = {
      owner: ownerFor(scope),
      cachedAt: Date.now(),
      data,
    };
    await run("readwrite", (store) => store.put(entry, key));
    if (!pruned) {
      pruned = true;
      void pruneExpired();
    }
  } catch {
    // Cuota llena / modo privado: simplemente no hay copia offline
  }
};

/**
 * Borra la copia offline de datos privados (cierre de sesión). Se conserva lo
 * "public" (branding del dominio, ya visible para cualquiera en el login).
 */
export const clearOfflineCache = async (): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if ((cursor.value as CacheEntry<unknown>).owner !== "public") {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
};

/**
 * Con copia guardada, cuánto esperar la respuesta en vivo antes de mostrar la
 * copia mientras tanto. Sirve para señal "muerta" (la petición ni falla ni
 * responde) y para servidores lentos: en ambos casos el usuario ve su agenda ya,
 * no un loader. Mostrar la copia NO significa "sin conexión": la petición viva
 * sigue corriendo y su resultado llega en `pending`.
 * Si ya sabemos que estamos offline se espera menos: la red probablemente sigue caída.
 */
const SHOW_COPY_AFTER_MS = 4_000;
const SHOW_COPY_AFTER_KNOWN_OFFLINE_MS = 1_500;

export interface FetchOfflineOptions {
  /**
   * No mostrar la copia por tardanza: esperar la respuesta en vivo (hasta el
   * timeout de la petición). Para acciones del usuario como "Reintentar", donde
   * adelantarse con la copia haría imposible que la acción llegue a funcionar.
   */
  waitForLive?: boolean;
}

/**
 * Tras un fallo de la petición viva: ¿estamos realmente sin conexión? Solo si es
 * un fallo "sin respuesta" Y la sonda tampoco alcanza al servidor se marca
 * offline (ver offlineMode.ts). Devuelve true si quedó offline.
 */
export const reportLiveFailure = async (error: unknown): Promise<boolean> => {
  if (!isNetworkError(error)) return false;
  const reachable = await isServerReachable();
  if (!reachable) markOffline();
  return !reachable;
};

const STILL_WAITING = Symbol("still-waiting");

/**
 * Intenta la petición en vivo; si no llega, sirve la última copia guardada.
 * - Éxito: guarda la respuesta y marca "en línea".
 * - Con copia y sin respuesta tras unos segundos: devuelve la copia + `pending`
 *   (la petición viva, sin marcar offline). Quien la muestre debe reemplazarla
 *   cuando `pending` resuelva, o avisar si falla.
 * - Falla por red con copia: la devuelve; queda offline solo si la sonda confirma
 *   que no se alcanza al servidor (reportLiveFailure).
 * - Falla por red sin copia: relanza el error (el llamador decide qué mostrar).
 * - Errores del servidor (401/403/500…): se relanzan tal cual, sin usar la copia.
 */
export const fetchWithOfflineFallback = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  scope: Scope = "user",
  options: FetchOfflineOptions = {}
): Promise<OfflineResult<T>> => {
  const cachePromise = cacheGet<T>(key, scope); // en paralelo a la petición

  const live = fetcher().then((data) => {
    void cacheSet(key, data, scope);
    markLive();
    return data;
  });
  // Si nadie consume `pending`, que su rechazo no quede como "unhandled"
  live.catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const raced: Array<Promise<T | typeof STILL_WAITING>> = [live];
  if (!options.waitForLive) {
    raced.push(
      new Promise<typeof STILL_WAITING>((resolve) => {
        timer = setTimeout(
          async () => {
            // Solo se adelanta a la petición si hay algo que mostrar en su lugar
            if (await cachePromise) resolve(STILL_WAITING);
          },
          getOfflineSnapshot().offline
            ? SHOW_COPY_AFTER_KNOWN_OFFLINE_MS
            : SHOW_COPY_AFTER_MS
        );
      })
    );
  }

  try {
    const result = await Promise.race(raced);
    if (result !== STILL_WAITING) return { data: result, cachedAt: null };
    const entry = await cachePromise;
    if (entry) {
      // ¿Servidor lento o sin red? La petición viva no lo dice (en ambos casos
      // solo "no responde"), así que se pregunta con una sonda liviana en
      // paralelo: si el servidor contesta es lentitud y se sigue esperando; si
      // no, se declara offline ya, sin esperar el timeout completo.
      void isServerReachable().then((reachable) => {
        if (!reachable) markOffline();
      });
      return { data: entry.data, cachedAt: entry.cachedAt, pending: live };
    }
    return { data: await live, cachedAt: null };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const entry = await cachePromise;
    await reportLiveFailure(error);
    if (entry) return { data: entry.data, cachedAt: entry.cachedAt };
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
