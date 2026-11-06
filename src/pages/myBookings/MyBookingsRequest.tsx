import React, { useEffect, useState } from "react";
import { Alert, Anchor, Box, Button, Container, Flex, Paper, Text, useMantineTheme } from "@mantine/core";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IconCalendarSearch } from "@tabler/icons-react";
import { FaWhatsapp } from "react-icons/fa";
import { type CountryCode } from "libphonenumber-js";
import { RootState } from "../../app/store";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import {
  lookupMyBookings,
  requestMyBookingsLink,
  savedBookingsKey,
  type BookingsLinkRequestResult,
  type MyBookings,
} from "../../services/clientBookingsService";
import MyBookingsView from "./MyBookingsView";

/**
 * Consulta pública de reservas por teléfono: muestra las próximas citas y
 * clases en modo solo lectura. Para cancelar, el cliente pide su enlace
 * personal, que llega por WhatsApp (así cancelar exige tener el teléfono, no
 * solo saber el número). Si el enlace ya se abrió en este dispositivo, se va
 * directo a él.
 */
const MyBookingsRequest: React.FC = () => {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<MyBookings | null>(null);
  const [linkStatus, setLinkStatus] = useState<BookingsLinkRequestResult["status"] | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!organization?._id) return;
    try {
      const token = localStorage.getItem(savedBookingsKey(organization._id as string));
      if (token) navigate(`/mis-reservas/${token}`, { replace: true });
    } catch {
      /* almacenamiento no disponible */
    }
  }, [organization?._id, navigate]);

  const handleLookup = async () => {
    setError("");
    if (!phoneE164) {
      setError("Ingresa un número de teléfono válido.");
      return;
    }
    setSearching(true);
    try {
      setData(await lookupMyBookings(phoneE164));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendLink = async () => {
    if (!phoneE164) return;
    setLinkError("");
    setSendingLink(true);
    try {
      const res = await requestMyBookingsLink(phoneE164);
      setLinkStatus(res.status);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "No se pudo enviar el enlace.");
    } finally {
      setSendingLink(false);
    }
  };

  const reset = () => {
    // El campo de teléfono se vuelve a montar vacío: no dejar el número anterior.
    setPhoneE164(null);
    setData(null);
    setLinkStatus(null);
    setLinkError("");
    setError("");
  };

  const whatsappUrl = organization?.whatsappUrl as string | undefined;

  if (data) {
    const hasCancellable =
      data.appointments.some((a) => a.canCancel) ||
      data.pendingReservations.some((r) => r.canCancel) ||
      data.classes.some((c) => c.canCancel);

    const notice = hasCancellable ? (
      linkStatus === "sent" || linkStatus === "cooldown" ? (
        <Alert color="green" icon={<FaWhatsapp size={18} />}>
          {linkStatus === "sent"
            ? "¡Listo! Te enviamos por WhatsApp el enlace para cancelar o gestionar tus reservas."
            : "Ya te enviamos el enlace hace un momento. Revisa tu WhatsApp."}
        </Alert>
      ) : (
        <Alert color={linkStatus === "unavailable" ? "yellow" : "blue"} variant="light">
          {linkStatus === "unavailable" ? (
            <>
              No pudimos enviarte el enlace por WhatsApp en este momento. Si necesitas cancelar,
              escríbenos directamente.
              {whatsappUrl && (
                <Button
                  component="a"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  color="green"
                  size="xs"
                  mt="sm"
                  leftSection={<FaWhatsapp size={14} />}
                  display="flex"
                >
                  Escribir al negocio
                </Button>
              )}
            </>
          ) : (
            <>
              <Text size="sm">
                ¿Necesitas cancelar? Por seguridad te enviamos un enlace a tu WhatsApp para hacerlo.
              </Text>
              {linkError && (
                <Text size="sm" c="red" mt={4}>
                  {linkError}
                </Text>
              )}
              <Button
                mt="sm"
                size="xs"
                color="green"
                leftSection={<FaWhatsapp size={14} />}
                onClick={handleSendLink}
                loading={sendingLink}
              >
                Enviarme el enlace
              </Button>
            </>
          )}
        </Alert>
      )
    ) : null;

    return (
      <Container size="sm" py="lg" px="md">
        <MyBookingsView
          data={data}
          notice={notice}
          footer={
            <Text size="xs" c="dimmed" ta="center">
              <Anchor size="xs" component="button" onClick={reset}>
                Consultar otro número
              </Anchor>
            </Text>
          }
        />
      </Container>
    );
  }

  return (
    <Flex justify="center" align="center" style={{ minHeight: "85vh" }}>
      <Paper
        radius="xl"
        shadow="lg"
        p="lg"
        withBorder
        style={{ minWidth: 300, maxWidth: 380, width: "95%", textAlign: "center" }}
      >
        <Flex direction="column" align="center" gap="sm">
          <Box p={12} mb={6}>
            <IconCalendarSearch size={30} color={theme.colors[theme.primaryColor][6]} />
          </Box>
          <Text size="xl" fw={800} mb={2} style={{ color: theme.colors[theme.primaryColor][7] }}>
            Mis reservas
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Escribe tu número para ver tus próximas citas y clases.
          </Text>
        </Flex>

        <Box mt="xs" style={{ textAlign: "left" }}>
          <InternationalPhoneInput
            label="Número de teléfono"
            organizationDefaultCountry={(organization?.default_country as CountryCode) || "CO"}
            onChange={(e164) => setPhoneE164(e164)}
            required
            compact
          />
        </Box>

        {error && (
          <Text mt="sm" c="red" fw={500} size="sm">
            {error}
          </Text>
        )}

        <Button
          fullWidth
          mt="lg"
          color={theme.primaryColor}
          radius="xl"
          size="md"
          onClick={handleLookup}
          loading={searching}
          disabled={!phoneE164}
          style={{ fontWeight: 700 }}
        >
          Ver mis reservas
        </Button>
      </Paper>
    </Flex>
  );
};

export default MyBookingsRequest;
