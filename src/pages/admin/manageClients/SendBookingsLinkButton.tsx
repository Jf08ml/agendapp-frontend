/**
 * Botón de la ficha del cliente para compartir su enlace "Mis reservas"
 * (citas y clases, con cancelación): abrir WhatsApp con el mensaje listo (sin
 * costo de mensajes), copiar el enlace o verlo.
 */
import { useState } from "react";
import { Button, Menu } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCalendarSearch, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { FaWhatsapp } from "react-icons/fa";
import type { Client } from "../../../services/clientService";
import { getClientBookingsLink } from "../../../services/clientBookingsService";

export default function SendBookingsLinkButton({ client, orgName }: { client: Client; orgName?: string }) {
  const [loading, setLoading] = useState(false);

  const withLink = async (action: (url: string) => void | Promise<void>) => {
    setLoading(true);
    try {
      const { url } = await getClientBookingsLink(client._id);
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
        `¡Hola${firstName ? `, ${firstName}` : ""}! 📅 Aquí puedes ver tus citas y clases en ${orgName || "nuestro negocio"}:\n${url}\n\n` +
        `Desde ese enlace también puedes cancelar si lo necesitas.`;
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
        <Button fullWidth variant="light" color="blue" leftSection={<IconCalendarSearch size={16} />} loading={loading}>
          Enlace «Mis reservas»
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
          Ver reservas
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
