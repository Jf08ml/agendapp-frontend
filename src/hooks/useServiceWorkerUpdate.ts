import { useEffect, useState, useCallback } from 'react';
import { showNotification } from '@mantine/notifications';

interface Version {
  version: string;
  timestamp: number;
  buildDate: string;
}

export const useServiceWorkerUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);

  // Obtener versión actual
  const fetchCurrentVersion = useCallback(async () => {
    try {
      const response = await fetch('/version.json?_=' + Date.now());
      const version: Version = await response.json();
      return version;
    } catch (error) {
      console.error('Error fetching version:', error);
      return null;
    }
  }, []);

  // Verificar si hay actualización disponible
  const checkForUpdates = useCallback(async () => {
    if (!registration) return;

    try {
      // Forzar chequeo de actualización del SW
      await registration.update();

      // Verificar versión del archivo
      const newVersion = await fetchCurrentVersion();
      if (!newVersion || !currentVersion) return;

      if (newVersion.timestamp > currentVersion.timestamp) {
        console.log('Nueva versión disponible:', newVersion.buildDate);
        setUpdateAvailable(true);
        
        // Countdown de 10 segundos antes de actualizar
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
            
            // Aplicar actualización después de 500ms
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [registration, currentVersion, fetchCurrentVersion]);

  // Aplicar actualización
  const applyUpdate = useCallback(() => {
    if (!registration || !registration.waiting) {
      window.location.reload();
      return;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }, [registration]);

  // Inicializar
  useEffect(() => {
    const init = async () => {
      // Obtener versión inicial
      const version = await fetchCurrentVersion();
      if (version) {
        setCurrentVersion(version);
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

        // Detectar cuando un nuevo SW está instalado
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              console.log('Service Worker actualizado y listo');
            }
          });
        });

        // Chequeo inicial
        await reg.update();
      } catch (error) {
        console.error('Error registrando service worker:', error);
      }
    };

    void init();
  }, [fetchCurrentVersion]);

  // Polling cada 60 segundos
  useEffect(() => {
    if (!registration) return;

    const interval = setInterval(() => {
      void checkForUpdates();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
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
