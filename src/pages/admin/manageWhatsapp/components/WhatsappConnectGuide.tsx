import { Alert, List, Text, ThemeIcon } from "@mantine/core";
import { BiInfoCircle, BiCheckCircle } from "react-icons/bi";

/**
 * Guía visual de conexión de WhatsApp. Aclara la DIRECCIÓN del flujo —el error
 * común documentado es que el usuario cree que debe enviarnos su QR, cuando es al
 * revés: escanea desde su celular el código que aparece en pantalla.
 */
export default function WhatsappConnectGuide() {
  return (
    <Alert
      icon={<BiInfoCircle size={18} />}
      color="teal"
      variant="light"
      radius="md"
      mb="md"
      title="Cómo conectar tu WhatsApp (1 minuto)"
    >
      <Text size="sm" mb="xs">
        Vinculas tu WhatsApp como un dispositivo más, igual que <b>WhatsApp Web</b>. No
        nos envías nada: tú escaneas desde tu celular el código que aparece aquí abajo.
      </Text>
      <List
        spacing={4}
        size="sm"
        center
        icon={
          <ThemeIcon color="teal" size={18} radius="xl" variant="light">
            <BiCheckCircle size={12} />
          </ThemeIcon>
        }
      >
        <List.Item>Abre <b>WhatsApp</b> en el celular del negocio.</List.Item>
        <List.Item>
          Entra a <b>Ajustes</b> → <b>Dispositivos vinculados</b>.
        </List.Item>
        <List.Item>
          Toca <b>Vincular un dispositivo</b>.
        </List.Item>
        <List.Item>
          Apunta la cámara al <b>código QR de esta pantalla</b> (o usa el código de
          vinculación).
        </List.Item>
      </List>
      <Text size="xs" c="dimmed" mt="xs">
        Consejo: mantén ese teléfono encendido y con internet — es el que envía los
        mensajes a tus clientes.
      </Text>
    </Alert>
  );
}
