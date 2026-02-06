import { useEffect, useState } from "react";
import {
  Switch,
  Text,
  Flex,
  Loader,
  Notification as Alert,
  List,
  Button,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  createSubscription,
  deleteSubscription,
} from "../services/subscriptionService";

interface NotificationToggleProps {
  userId: string;
  showInstructions?: boolean;
  setShowInstructions?: (value: boolean) => void;
}

// Función para convertir la clave VAPID de base64url a Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Función para detectar el navegador
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua);

  return { isChrome, isSafari, isFirefox, isEdge, isAndroid, isIOS };
};

const NotificationToggle = ({
  userId,
  setShowInstructions: externalSetShowInstructions,
}: NotificationToggleProps) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [, setInternalShowInstructions] = useState<boolean>(false);

  // Usar el estado externo si se proporciona, si no usar el interno
  const setShowInstructions =
    externalSetShowInstructions ?? setInternalShowInstructions;

  // Verificar si las notificaciones ya están habilitadas
  useEffect(() => {
    const checkSubscription = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsEnabled(!!subscription); // Si hay una suscripción, las notificaciones están habilitadas
      } catch (err) {
        console.error("Error al verificar suscripción:", err);
        setError("No se pudo verificar el estado de las notificaciones.");
      }
    };

    checkSubscription();
  }, []);

  // Manejar el cambio del switch
  const handleToggle = async () => {
    // Guards (mobile-safe)
    const hasSW =
      typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const hasNotification =
      typeof window !== "undefined" && "Notification" in window;
    const hasPushManager =
      typeof window !== "undefined" && "PushManager" in window;

    // Si no hay soporte base, no seguimos
    if (!hasSW || !hasNotification) {
      setError("Este navegador no soporta notificaciones.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      // 🔕 Deshabilitar
      if (isEnabled) {
        const subscription =
          await registration.pushManager?.getSubscription?.();
        if (subscription) {
          await subscription.unsubscribe();

          // Backend cleanup
          await deleteSubscription(subscription.endpoint, userId);
        }

        setIsEnabled(false);
        return;
      }

      // 🔔 Habilitar (validar push real)
      // OJO: iOS puede tener Notification pero NO PushManager (o solo en PWA instalada).
      if (!hasPushManager || !registration.pushManager) {
        setShowInstructions(true);
        throw new Error(
          "Este dispositivo/navegador no soporta notificaciones push. En iPhone debes abrir en Safari y tener la PWA instalada (si tu versión lo soporta).",
        );
      }

      // Permisos
      const perm = window.Notification.permission;

      if (perm === "denied") {
        setShowInstructions(true);
        throw new Error(
          "Los permisos de notificación están bloqueados. Revisa las instrucciones para habilitarlos.",
        );
      }

      if (perm === "default") {
        const requested = await window.Notification.requestPermission();
        if (requested !== "granted") {
          throw new Error("Permiso de notificaciones denegado por el usuario.");
        }
      }

      if (window.Notification.permission !== "granted") {
        throw new Error(
          "No se pueden habilitar las notificaciones sin los permisos necesarios.",
        );
      }

      // VAPID
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
        | string
        | undefined;
      if (!vapidKey) {
        throw new Error("La clave VAPID no está configurada.");
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Evitar duplicados: si ya existe suscripción, úsala
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));

      // Enviar al backend
      const json = subscription.toJSON();
      await createSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
        userId,
      });

      setIsEnabled(true);
    } catch (err) {
      console.error("Error al cambiar el estado de las notificaciones:", err);
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el estado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasNotificationAPI =
    typeof window !== "undefined" && "Notification" in window;

  const permission = hasNotificationAPI
    ? window.Notification.permission
    : "unsupported";

  return (
    <Flex direction="column" gap="xs">
      <Flex align="center" gap="md">
        <Switch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isLoading}
          size="xs"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <Text size="xs">
          {isEnabled ? "Noti. activadas" : "Noti. desactivadas"}
        </Text>
        {isLoading && <Loader size="sm" />}
      </Flex>

      {/* Mostrar error si ocurre */}
      {error && (
        <Alert
          color="red"
          title="Error"
          onClose={() => setError(null)}
          withCloseButton
          mt="xs"
        >
          {error}
          {permission === "denied" && (
            <Button
              size="xs"
              variant="light"
              mt="xs"
              onClick={() => setShowInstructions(true)}
              leftSection={<IconInfoCircle size={16} />}
            >
              Ver instrucciones
            </Button>
          )}
        </Alert>
      )}

      {/* Modal con instrucciones específicas según el navegador */}
      {/* Este Modal está renderizado en NotificationsMenu para evitar conflictos con el portal del Menu */}
    </Flex>
  );
};

// Componente con las instrucciones específicas
export const InstructionsContent = () => {
  const { isChrome, isSafari, isFirefox, isEdge, isAndroid, isIOS } =
    getBrowserInfo();

  if (isIOS) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm">
          Las notificaciones push en Safari para iOS requieren que la PWA esté
          instalada:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>Abre esta app en Safari</List.Item>
          <List.Item>
            Toca el botón de compartir (cuadro con flecha hacia arriba)
          </List.Item>
          <List.Item>Selecciona "Añadir a pantalla de inicio"</List.Item>
          <List.Item>Abre la app desde la pantalla de inicio</List.Item>
          <List.Item>
            Ve a Ajustes {">"} Notificaciones {">"} [Nombre de la app]
          </List.Item>
          <List.Item>Activa "Permitir notificaciones"</List.Item>
        </List>
      </Flex>
    );
  }

  if (isAndroid && isChrome) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>
          Chrome en Android:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Toca el ícono de menú (tres puntos) en la barra de direcciones
          </List.Item>
          <List.Item>
            Selecciona "Configuración del sitio" o "Información"
          </List.Item>
          <List.Item>Busca "Notificaciones"</List.Item>
          <List.Item>Cambia de "Bloqueado" a "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
      </Flex>
    );
  }

  if (isChrome || isEdge) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>
          Chrome/Edge en escritorio:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Haz clic en el ícono de candado 🔒 o información (i) en la barra de
            direcciones
          </List.Item>
          <List.Item>Busca "Notificaciones"</List.Item>
          <List.Item>Cambia de "Bloqueado" a "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
        <Text size="xs" c="dimmed">
          O ve a Configuración {">"} Privacidad y seguridad {">"} Configuración
          de sitios {">"} Notificaciones
        </Text>
      </Flex>
    );
  }

  if (isFirefox) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>
          Firefox:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Haz clic en el ícono de candado 🔒 en la barra de direcciones
          </List.Item>
          <List.Item>
            Haz clic en la flecha {">"} junto a "Bloqueado temporalmente"
          </List.Item>
          <List.Item>Busca "Notificaciones" y selecciona "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
      </Flex>
    );
  }

  if (isSafari) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>
          Safari:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Ve a Safari {">"} Preferencias {">"} Sitios web
          </List.Item>
          <List.Item>
            Selecciona "Notificaciones" en el panel izquierdo
          </List.Item>
          <List.Item>Busca este sitio web en la lista</List.Item>
          <List.Item>Cambia de "Denegar" a "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
      </Flex>
    );
  }

  // Instrucciones genéricas
  return (
    <Flex direction="column" gap="md">
      <Text size="sm">Para habilitar las notificaciones:</Text>
      <List size="sm" spacing="xs">
        <List.Item>
          Busca el ícono de información o candado en la barra de direcciones
        </List.Item>
        <List.Item>Busca la opción "Notificaciones" o "Permisos"</List.Item>
        <List.Item>Cambia de "Bloqueado" o "Denegar" a "Permitir"</List.Item>
        <List.Item>Recarga la página</List.Item>
      </List>
    </Flex>
  );
};

export default NotificationToggle;
