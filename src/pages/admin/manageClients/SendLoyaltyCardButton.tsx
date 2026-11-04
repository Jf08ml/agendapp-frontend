/**
 * Botón de la ficha del cliente para compartir su tarjeta virtual de fidelidad:
 * abrir WhatsApp con el mensaje listo (sin costo de mensajes), copiar el enlace
 * o ver la tarjeta.
 */
import { useState } from "react";
import { Button, Menu } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCopy, IconCreditCard, IconExternalLink } from "@tabler/icons-react";
import { FaWhatsapp } from "react-icons/fa";
import type { Client } from "../../../services/clientService";
import { getClientLoyaltyCardLink } from "../../../services/loyaltyCardService";

export default function SendLoyaltyCardButton({ client, orgName }: { client: Client; orgName?: string }) {
  const [loading, setLoading] = useState(false);

  const withLink = async (action: (url: string) => void | Promise<void>) => {
    setLoading(true);
    try {
      const { url } = await getClientLoyaltyCardLink(client._id);
      await action(url);
    } catch (e) {
      showNotification({ title: "Error", message: (e as Error).message, color: "red" });
    } finally {
      setLoading(false);
    }
  };

  const phoneDigits = String(client.phone_e164 || client.phoneNumber || "").replace(/\D/g, "");

  const sendWhatsapp = () =>
    withLink((url) => {
      const firstName = (client.name || "").trim().split(/\s+/)[0];
      const text =
        `¡Hola${firstName ? `, ${firstName}` : ""}! 💳 Esta es tu tarjeta de fidelidad de ${orgName || "nuestro negocio"}:\n${url}\n\n` +
        `Muéstrala en cada visita para registrar tus servicios y referidos. Puedes guardarla en la pantalla de inicio de tu teléfono.`;
      window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`, "_blank");
    });

  const copy = () =>
    withLink(async (url) => {
      await navigator.clipboard.writeText(url);
      showNotification({ title: "Enlace copiado", message: "Pégalo donde quieras enviarlo.", color: "green" });
    });

  // La pestaña se abre antes del await para que el navegador no la bloquee.
  const view = () => {
    const tab = window.open("", "_blank");
    withLink((url) => {
      if (tab) tab.location.href = url;
      else window.location.href = url;
    });
  };

  return (
    <Menu position="bottom-end" withinPortal zIndex={400}>
      <Menu.Target>
        <Button fullWidth variant="light" color="indigo" leftSection={<IconCreditCard size={16} />} loading={loading}>
          Tarjeta de fidelidad
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<FaWhatsapp size={14} />} onClick={sendWhatsapp} disabled={!phoneDigits}>
          Enviar por WhatsApp
        </Menu.Item>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={copy}>
          Copiar enlace
        </Menu.Item>
        <Menu.Item leftSection={<IconExternalLink size={14} />} onClick={view}>
          Ver tarjeta
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
