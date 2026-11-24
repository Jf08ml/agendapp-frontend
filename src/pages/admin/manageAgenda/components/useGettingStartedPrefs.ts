// Preferencias de «Primeros pasos» en el navegador (plegado, oculto hasta
// mañana, no volver a mostrar, enlace compartido), por negocio.
import { useState } from "react";
import { isGettingStartedHidden, tomorrowStart } from "./gettingStartedModel";

// ─── Preferencias en el navegador (plegado, oculto, enlace compartido) ──────
const keyOf = (orgId: string | undefined, name: string) => `ag_primeros_pasos_${name}_${orgId || "x"}`;
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento: dura esta visita */
  }
};

export function useGettingStartedPrefs(orgId: string | undefined) {
  const [collapsed, setCollapsedState] = useState(() => read(keyOf(orgId, "plegado")) === "1");
  const [hiddenUntil, setHiddenUntil] = useState<number | null>(() => Number(read(keyOf(orgId, "oculto_hasta"))) || null);
  const [neverShow, setNeverShow] = useState(() => read(keyOf(orgId, "nunca")) === "1");
  const [linkShared, setLinkShared] = useState(() => read(keyOf(orgId, "enlace")) === "1");

  return {
    collapsed,
    setCollapsed: (v: boolean) => {
      setCollapsedState(v);
      write(keyOf(orgId, "plegado"), v ? "1" : "0");
    },
    hidden: isGettingStartedHidden({ neverShow, hiddenUntilMs: hiddenUntil, nowMs: Date.now() }),
    hideUntilTomorrow: () => {
      const t = tomorrowStart(Date.now());
      setHiddenUntil(t);
      write(keyOf(orgId, "oculto_hasta"), String(t));
    },
    hideForever: () => {
      setNeverShow(true);
      write(keyOf(orgId, "nunca"), "1");
    },
    linkShared,
    markShared: () => {
      setLinkShared(true);
      write(keyOf(orgId, "enlace"), "1");
    },
  };
}

export type GettingStartedPrefs = ReturnType<typeof useGettingStartedPrefs>;

/** Botón del encabezado de la agenda cuando la lista está plegada. */
