import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../app/store";
import { updateOrganizationState } from "../features/organization/sliceOrganization";
import {
  cacheOrganizationConfig,
  fetchOrganizationConfigLive,
} from "../services/organizationService";
import { isNetworkError } from "../utils/offlineCache";
import { markLive, markOffline, useOfflineMode } from "../utils/offlineMode";

const PROBE_INTERVAL_MS = 30_000;

/**
 * Detecta cuándo vuelve la conexión mientras la app está en modo offline.
 *
 * Sondea con la config de la org (el mismo dato que ya se pide al arrancar, así
 * de paso queda refrescada) cada 30s mientras esté visible, y de inmediato en
 * cuanto el navegador avisa `online` o el usuario vuelve a la pestaña. Cuando
 * responde, marca "en línea": las pantallas que mostraban copia guardada
 * (ver useOfflineMode().recoveries) vuelven a pedir sus datos.
 *
 * No depende de navigator.onLine porque con wifi sin internet reporta "online".
 */
export function useOfflineRecovery() {
  const dispatch = useDispatch<AppDispatch>();
  const { offline } = useOfflineMode();
  const probingRef = useRef(false);

  const probe = useCallback(async () => {
    if (probingRef.current) return;
    probingRef.current = true;
    try {
      const organization = await fetchOrganizationConfigLive();
      void cacheOrganizationConfig(organization);
      dispatch(updateOrganizationState(organization));
      markLive();
    } catch (error) {
      // Si el servidor respondió (aunque sea con error, p. ej. 404 en rutas sin
      // org como /superadmin) la red está bien; solo un fallo de red es "offline".
      if (!isNetworkError(error)) markLive();
    } finally {
      probingRef.current = false;
    }
  }, [dispatch]);

  // Eventos del navegador: rápidos, pero no confiables por sí solos
  useEffect(() => {
    const handleOnline = () => {
      void probe();
    };
    const handleOffline = () => markOffline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [probe]);

  // Sondeo mientras estemos offline
  useEffect(() => {
    if (!offline) return;
    const tick = () => {
      if (document.visibilityState === "visible") void probe();
    };
    const interval = setInterval(tick, PROBE_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [offline, probe]);
}
