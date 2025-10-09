import { useEffect, useState } from "react";
import { Switch, Text, Flex, Loader, Notification as Alert } from "@mantine/core";
import {
  createSubscription,
  deleteSubscription,
} from "../services/subscriptionService";

interface NotificationToggleProps {
  userId: string;
}

const NotificationToggle = ({ userId }: NotificationToggleProps) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            throw new Error("Permiso de notificaciones denegado por el usuario.");
          }
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
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
      setError("No se pudo actualizar el estado de las notificaciones.");
    } finally {
      setIsLoading(false); // Ocultar indicador de carga
    }
  };

  return (
    <Flex direction="column">
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
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}
    </Flex>
  );
};

export default NotificationToggle;
