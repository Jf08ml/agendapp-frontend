import { useEffect, useState } from "react";
import { Switch, Text, Flex, Loader, Notification as Alert, Modal, List, Button } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  createSubscription,
  deleteSubscription,
} from "../services/subscriptionService";

interface NotificationToggleProps {
  userId: string;
}

// Función para convertir la clave VAPID de base64url a Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

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

const NotificationToggle = ({ userId }: NotificationToggleProps) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

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
    if (!("serviceWorker" in navigator)) {
      setError("El navegador no soporta notificaciones.");
      return;
    }

    setIsLoading(true); // Mostrar indicador de carga
    setError(null); // Reiniciar errores previos

    try {
      const registration = await navigator.serviceWorker.ready;

      if (isEnabled) {
        // Deshabilitar notificaciones
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deleteSubscription(subscription.endpoint, userId); // Llamar al backend para eliminar la suscripción
          console.log("Suscripción eliminada del backend y navegador");
        }
      } else {
        // Habilitar notificaciones
        // Verificar el permiso actual
        if (Notification.permission === "denied") {
          setShowInstructions(true);
          throw new Error(
            "Los permisos de notificación están bloqueados. Haz clic en 'Ver instrucciones' para saber cómo habilitarlos."
          );
        }

        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            throw new Error("Permiso de notificaciones denegado por el usuario.");
          }
        }

        // Verificar nuevamente después de solicitar permisos
        if (Notification.permission !== "granted") {
          throw new Error("No se pueden habilitar las notificaciones sin los permisos necesarios.");
        }

        // Convertir la clave VAPID a Uint8Array
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          throw new Error("La clave VAPID no está configurada en el servidor.");
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Enviar la suscripción al backend
        await createSubscription({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh ?? "",
            auth: subscription.toJSON().keys?.auth ?? "",
          },
          userId,
        });
      }

      // Cambiar el estado del switch
      setIsEnabled(!isEnabled);
    } catch (err) {
      console.error("Error al cambiar el estado de las notificaciones:", err);
      
      // Mostrar un mensaje de error más específico
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo actualizar el estado de las notificaciones.");
      }
    } finally {
      setIsLoading(false); // Ocultar indicador de carga
    }
  };

  return (
    <Flex direction="column" gap="xs">
      <Flex align="center" gap="md">
        <Switch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isLoading}
          size="xs"
        />
        <Text size="xs">
          {isEnabled
            ? "Noti. activadas"
            : "Noti. desactivadas"}
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
          {Notification.permission === "denied" && (
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
      <Modal
        opened={showInstructions}
        onClose={() => setShowInstructions(false)}
        title="Cómo habilitar las notificaciones"
        size="lg"
        zIndex={1000}
        centered
        trapFocus={true}
        overlayProps={{
          blur: 0.5,
          opacity: 0.55,
          backgroundOpacity: 0.55,
        }}
        styles={{
          content: {
            backgroundColor: "white",
            position: "relative",
            zIndex: 1001,
          },
          header: {
            backgroundColor: "white",
            zIndex: 1001,
          },
          body: {
            position: "relative",
            zIndex: 1001,
          },
        }}
      >
        <InstructionsContent />
      </Modal>
    </Flex>
  );
};

// Componente con las instrucciones específicas
const InstructionsContent = () => {
  const { isChrome, isSafari, isFirefox, isEdge, isAndroid, isIOS } = getBrowserInfo();

  if (isIOS) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm">
          Las notificaciones push en Safari para iOS requieren que la PWA esté instalada:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>Abre esta app en Safari</List.Item>
          <List.Item>Toca el botón de compartir (cuadro con flecha hacia arriba)</List.Item>
          <List.Item>Selecciona "Añadir a pantalla de inicio"</List.Item>
          <List.Item>Abre la app desde la pantalla de inicio</List.Item>
          <List.Item>Ve a Ajustes {">"} Notificaciones {">"} [Nombre de la app]</List.Item>
          <List.Item>Activa "Permitir notificaciones"</List.Item>
        </List>
      </Flex>
    );
  }

  if (isAndroid && isChrome) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>Chrome en Android:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Toca el ícono de menú (tres puntos) en la barra de direcciones</List.Item>
          <List.Item>Selecciona "Configuración del sitio" o "Información"</List.Item>
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
        <Text size="sm" fw={500}>Chrome/Edge en escritorio:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Haz clic en el ícono de candado 🔒 o información (i) en la barra de direcciones</List.Item>
          <List.Item>Busca "Notificaciones"</List.Item>
          <List.Item>Cambia de "Bloqueado" a "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
        <Text size="xs" c="dimmed">
          O ve a Configuración {">"} Privacidad y seguridad {">"} Configuración de sitios {">"} Notificaciones
        </Text>
      </Flex>
    );
  }

  if (isFirefox) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>Firefox:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Haz clic en el ícono de candado 🔒 en la barra de direcciones</List.Item>
          <List.Item>Haz clic en la flecha {">"} junto a "Bloqueado temporalmente"</List.Item>
          <List.Item>Busca "Notificaciones" y selecciona "Permitir"</List.Item>
          <List.Item>Recarga la página</List.Item>
        </List>
      </Flex>
    );
  }

  if (isSafari) {
    return (
      <Flex direction="column" gap="md">
        <Text size="sm" fw={500}>Safari:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Ve a Safari {">"} Preferencias {">"} Sitios web</List.Item>
          <List.Item>Selecciona "Notificaciones" en el panel izquierdo</List.Item>
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
      <Text size="sm">
        Para habilitar las notificaciones:
      </Text>
      <List size="sm" spacing="xs">
        <List.Item>Busca el ícono de información o candado en la barra de direcciones</List.Item>
        <List.Item>Busca la opción "Notificaciones" o "Permisos"</List.Item>
        <List.Item>Cambia de "Bloqueado" o "Denegar" a "Permitir"</List.Item>
        <List.Item>Recarga la página</List.Item>
      </List>
    </Flex>
  );
};

export default NotificationToggle;
