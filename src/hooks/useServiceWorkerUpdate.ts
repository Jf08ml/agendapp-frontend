import { useEffect, useState, useCallback, useRef } from 'react';
import { showNotification } from '@mantine/notifications';

interface Version {
  version: string;
  timestamp: number;
  buildDate: string;
}

const POLL_INTERVAL = 60_000; // 60 segundos

export const useServiceWorkerUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);

  // Refs para evitar problemas de closures stale en callbacks
  const currentVersionRef = useRef<Version | null>(null);
  const updateTriggeredRef = useRef(false);

  // Obtener versión del servidor (cache-busted)
  const fetchCurrentVersion = useCallback(async (): Promise<Version | null> => {
    try {
      const response = await fetch('/version.json?_=' + Date.now());
      return await response.json();
    } catch (error) {
      console.error('Error fetching version:', error);
      return null;
    }
  }, []);

  // Mostrar countdown y recargar
  const triggerUpdateReload = useCallback(() => {
    if (updateTriggeredRef.current) return; // evitar doble trigger
    updateTriggeredRef.current = true;
    setUpdateAvailable(true);

    let countdown = 10;
    const notificationId = 'update-countdown';

    const showCountdown = (seconds: number) => {
      showNotification({
        id: notificationId,
        title: '🎉 Nueva versión disponible',
        message: `Actualizando en ${seconds} segundo${seconds !== 1 ? 's' : ''}...`,
        color: 'blue',
        autoClose: false,
        withCloseButton: false,
        loading: true,
      });
    };

    showCountdown(countdown);

    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        showCountdown(countdown);
      } else {
        clearInterval(countdownInterval);
        showNotification({
          id: notificationId,
          title: '✅ Actualizando ahora',
          message: 'Aplicando nueva versión...',
          color: 'green',
          autoClose: 1000,
        });
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }, 1000);
  }, []);

  // Verificar si hay actualización comparando version.json
  const checkForUpdates = useCallback(async () => {
    if (!registration) return;

    try {
      // Forzar chequeo de actualización del SW
      await registration.update();

      // Comparar versión del archivo
      const newVersion = await fetchCurrentVersion();
      const savedVersion = currentVersionRef.current;
      if (!newVersion || !savedVersion) return;

      if (newVersion.timestamp > savedVersion.timestamp) {
        console.log('Nueva versión disponible:', newVersion.buildDate);
        triggerUpdateReload();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [registration, fetchCurrentVersion, triggerUpdateReload]);

  // Aplicar actualización manual
  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [registration]);

  // Inicializar SW y listeners
  useEffect(() => {
    const init = async () => {
      // Obtener versión inicial
      const version = await fetchCurrentVersion();
      if (version) {
        setCurrentVersion(version);
        currentVersionRef.current = version;
        console.log('Versión actual:', version.buildDate);
      }

      const ua = navigator.userAgent || '';
      const isInAppBrowser = /Instagram|Telegram|FBAN|FBAV|FB_IAB/i.test(ua);

      if (!('serviceWorker' in navigator) || isInAppBrowser) {
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/custom-sw.js');
        setRegistration(reg);

        // Detectar cuando un nuevo SW se instala
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nuevo Service Worker instalado y esperando');
              setUpdateAvailable(true);
              triggerUpdateReload();
            }
          });
        });

        // Detectar cuando un nuevo SW toma control (controllerchange)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Nuevo Service Worker tomó control');
          if (!updateTriggeredRef.current) {
            triggerUpdateReload();
          }
        });

        // Chequeo inicial
        await reg.update();
      } catch (error) {
        console.error('Error registrando service worker:', error);
      }
    };

    void init();
  }, [fetchCurrentVersion, triggerUpdateReload]);

  // Polling periódico + check al volver de background
  useEffect(() => {
    if (!registration) return;

    // Polling regular
    const interval = setInterval(() => {
      void checkForUpdates();
    }, POLL_INTERVAL);

    // Cuando el usuario vuelve al app (después de minimizar/cambiar tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visible, verificando actualizaciones...');
        void checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registration, checkForUpdates]);

  return {
    updateAvailable,
    applyUpdate,
    currentVersion,
    registration,
    checkForUpdates,
    isUpdateSupported: Boolean(registration),
  };
};
