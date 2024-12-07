import React, { useEffect, useState } from "react";
import { TextInput, Button, Checkbox, Box, Text, Flex } from "@mantine/core";
import { getClientByPhoneNumberAndOrganization } from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { useNavigate } from "react-router-dom";

const SearchClient: React.FC = () => {
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
        navigate("/plan-viewer", { state: { client } });
      }
    } catch (error) {
      console.error("Error searching client:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  return (
    <Flex justify="center" align="center" style={{ height: "80vh" }}>
      <Box
        bg="#DE739E"
        p="xl"
        style={{
          borderRadius: "8px",
          boxShadow: "0 0 20px rgba(0, 0, 0, 1)",
          color: "#E2E8F0",
          textAlign: "center",
        }}
      >
        <Text size="xl" fw={700}>
          Plan de fidelidad
        </Text>
        <TextInput
          mt="md"
          label="Número de Teléfono"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <Checkbox
          mt="md"
          label="Guardar mi información en este dispositivo"
          checked={rememberClient}
          onChange={(e) => setRememberClient(e.currentTarget.checked)}
        />
        {error && (
          <Text mt="md" c="red">
            {error}
          </Text>
        )}
        <Button mt="md" color="blue" onClick={handleSearch}>
          BUSCAR
        </Button>
      </Box>
    </Flex>
  );
};

export default SearchClient;
