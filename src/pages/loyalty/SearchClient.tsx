import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Flex, Paper, Text, useMantineTheme } from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { useNavigate } from "react-router-dom";
import { FaUserCheck, FaWhatsapp } from "react-icons/fa";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { type CountryCode } from "libphonenumber-js";
import { requestLoyaltyCard, savedCardKey } from "../../services/loyaltyCardService";

/**
 * Consulta pública de la tarjeta de fidelidad. El cliente escribe su teléfono y
 * le llega el enlace a su tarjeta por WhatsApp (así nadie ve la de otro con
 * solo saber su número). Si el negocio no puede enviar WhatsApp, se abre la
 * tarjeta directamente. Si la tarjeta ya se abrió en este dispositivo, se va
 * directo a ella.
 */
const SearchClient: React.FC = () => {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<"sent" | "cooldown" | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!organization?._id) return;
    // Consulta anterior por teléfono guardada (ya no se usa).
    try {
      localStorage.removeItem("savedClientData");
      const token = localStorage.getItem(savedCardKey(organization._id as string));
      if (token) navigate(`/mi-tarjeta/${token}`, { replace: true });
    } catch {
      /* almacenamiento no disponible */
    }
  }, [organization?._id, navigate]);

  const handleSearch = async () => {
    setError("");
    setSent(null);
    if (!phoneE164) {
      setError("Ingresa un número de teléfono válido.");
      return;
    }
    setSearching(true);
    try {
      const result = await requestLoyaltyCard(phoneE164);
      if (result.status === "direct") navigate(`/mi-tarjeta/${result.token}`);
      else setSent(result.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: "85vh" }}>
      <Paper
        radius="xl"
        shadow="lg"
        p="lg"
        withBorder
        style={{ minWidth: 300, maxWidth: 370, width: "95%", textAlign: "center" }}
      >
        <Flex direction="column" align="center" gap="sm">
          <Box p={12} mb={6}>
            <FaUserCheck size={28} color={theme.colors[theme.primaryColor][6]} />
          </Box>
          <Text size="xl" fw={800} mb={2} style={{ color: theme.colors[theme.primaryColor][7] }}>
            Tu tarjeta de fidelidad
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Escribe tu número y te enviamos por WhatsApp el enlace a tu tarjeta con tus servicios,
            referidos y premios.
          </Text>
        </Flex>

        {sent ? (
          <Alert color="green" icon={<FaWhatsapp size={18} />} ta="left">
            {sent === "sent"
              ? "¡Listo! Revisa tu WhatsApp: te enviamos el enlace a tu tarjeta."
              : "Ya te enviamos el enlace hace un momento. Revisa tu WhatsApp."}
          </Alert>
        ) : (
          <>
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
              onClick={handleSearch}
              loading={searching}
              disabled={!phoneE164}
              style={{ fontWeight: 700 }}
            >
              Ver mi tarjeta
            </Button>
          </>
        )}
      </Paper>
    </Flex>
  );
};

export default SearchClient;
