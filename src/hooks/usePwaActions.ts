// Acciones de la PWA que antes vivían en el Footer: instalar, actualizar,
// limpiar caché y versión. Las usan el footer público y el menú de usuario del
// panel.
import { useEffect, useState } from "react";
import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface AppVersion {
  version: string;
  timestamp: number;
  buildDate: string;
}

async function clearSiteData() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }
  window.location.reload();
}

export function usePwaActions() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [clearing, setClearing] = useState(false);
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch("/version.json?_=" + Date.now());
        const version: AppVersion = await response.json();
        setAppVersion(version);
      } catch {
        // silencioso
      }
    };
    void fetchVersion();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const clearCache = () => {
    if (!confirm("Esto limpiará la caché y recargará la página. ¿Continuar?")) return;
    setClearing(true);
    void clearSiteData();
  };

  return {
    canInstall: !!deferredPrompt,
    install,
    updateAvailable,
    applyUpdate,
    appVersion,
    clearing,
    clearCache,
  };
}
