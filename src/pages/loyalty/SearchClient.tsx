import React, { useEffect, useState } from "react";
import { TextInput, Button, Checkbox, Box, Text, Flex, Paper, useMantineTheme } from "@mantine/core";
import { getClientByPhoneNumberAndOrganization } from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { useNavigate } from "react-router-dom";
import { FaUserCheck } from "react-icons/fa";

const SearchClient: React.FC = () => {
  const theme = useMantineTheme();
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [rememberClient, setRememberClient] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const navigate = useNavigate();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Verificar si hay identificadores almacenados
  useEffect(() => {
    const savedData = localStorage.getItem("savedClientData");
    if (savedData) {
      const { phoneNumber, organizationId } = JSON.parse(savedData);
      fetchUpdatedClient(phoneNumber, organizationId);
    }
    // eslint-disable-next-line
  }, [navigate, organization]);

  const fetchUpdatedClient = async (
    phoneNumber: string,
    organizationId: string
  ) => {
    try {
      if (!organization) return;
      const updatedClient = await getClientByPhoneNumberAndOrganization(
        phoneNumber,
        organizationId
      );
      if (updatedClient) {
        navigate("/plan-viewer", { state: { client: updatedClient } });
      }
    } catch (error) {
      console.error("Error fetching updated client:", error);
      localStorage.removeItem("savedClientData");
    }
  };

  const handleSearch = async () => {
    setError("");
    if (!organization) {
      setError("Organización no encontrada.");
      return;
    }

    try {
      const client = await getClientByPhoneNumberAndOrganization(
        phoneNumber,
        organization._id as string
      );
      if (client) {
        if (rememberClient) {
          // Guardar solo los identificadores clave
          localStorage.setItem(
            "savedClientData",
            JSON.stringify({
              phoneNumber: client.phoneNumber,
              organizationId: organization._id,
            })
          );
        }
        navigate("/plan-viewer", {
          state: { client, organization: client.organizationId },
        });
      }
    } catch (error) {
      console.error("Error searching client:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error desconocido.");
      }
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: "85vh"}}>
      <Paper
        radius="xl"
        shadow="lg"
        p="lg"
        withBorder
        style={{
          minWidth: 320,
          maxWidth: 370,
          width: "95%",
          background: "#fff",
          textAlign: "center",
        }}
      >
        <Flex direction="column" align="center" gap="sm">
          <Box
            style={{
              borderRadius: "50%",
              padding: 12,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaUserCheck size={28} color={theme.colors[theme.primaryColor][6]} />
          </Box>
          <Text size="xl" fw={800} mb={2} style={{ color: theme.colors[theme.primaryColor][7] }}>
            Plan de fidelidad
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Ingresa tu número de teléfono para consultar tus puntos, bonos o beneficios.
          </Text>
        </Flex>

        <TextInput
          label="Número de Teléfono"
          placeholder="Ej: 3111234567"
          mt="xs"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          maxLength={12}
          inputMode="numeric"
          radius="md"
          size="md"
        />

        <Checkbox
          mt="sm"
          label="Guardar mi información en este dispositivo"
          checked={rememberClient}
          onChange={(e) => setRememberClient(e.currentTarget.checked)}
          color={theme.primaryColor}
          size="sm"
        />

        {error && (
          <Text mt="sm" c="red" fw={500}>
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
          style={{ fontWeight: 700, letterSpacing: 1 }}
        >
          Buscar
        </Button>
      </Paper>
    </Flex>
  );
};

export default SearchClient;
