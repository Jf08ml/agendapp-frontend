/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, ChangeEvent } from "react";
import { TextInput, Button, Box, Modal } from "@mantine/core";
import {
  createClient,
  updateClient,
  Client,
} from "../../../services/clientService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { DateInput } from "@mantine/dates";

interface ClientFormModalProps {
  opened: boolean;
  onClose: () => void;
  fetchClients: () => void;
  client?: Client | null;
  setClient?: React.Dispatch<React.SetStateAction<Client | null>>;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  opened,
  onClose,
  fetchClients,
  client,
  setClient,
}) => {
  const [name, setName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  // Función para restablecer los valores del formulario
  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setEmail("");
    setBirthDate(null);
    if (setClient) {
      setClient(null); // Restablecer el cliente
    }
  };

  // Cargar datos del cliente cuando esté en modo edición
  useEffect(() => {
    if (client) {
      setName(client.name.trim());
      setPhoneNumber(formatPhoneNumber(client.phoneNumber.trim()));
      setEmail(client.email?.trim() || "");
      setBirthDate(client.birthDate ? new Date(client.birthDate) : null);
    } else {
      resetForm();
    }
  }, [client]);

  const handleSubmit = async (): Promise<void> => {
    try {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      const formattedPhoneNumber = phoneNumber.replace(/\s/g, "");

      if (client) {
        // Modo edición: actualizar cliente
        const updatedData = {
          name: name.trim(),
          phoneNumber: formattedPhoneNumber,
          email: email.trim(),
          birthDate: birthDate || null,
        };
        await updateClient(client._id, updatedData);
        showNotification({
          title: "Éxito",
          message: "Cliente actualizado con éxito",
          color: "green",
          autoClose: 2000,
          position: "top-right",
        });
      } else {
        // Modo creación: crear cliente nuevo
        const newClient = {
          name: name.trim(),
          phoneNumber: formattedPhoneNumber,
          email: email.trim(),
          organizationId,
          birthDate: birthDate || null,
        };
        await createClient(newClient);
        showNotification({
          title: "Éxito",
          message: "Cliente creado con éxito",
          color: "green",
          autoClose: 2000,
          position: "top-right",
        });
      }

      // Refrescar la lista de clientes, restablecer el formulario y cerrar el modal
      fetchClients();
      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: client
          ? "Error al actualizar el cliente"
          : "Error al crear el cliente",
        color: "red",
        autoClose: 3000,
      });
    }
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      setter(event.target.value);
    };

  const formatPhoneNumber = (value: string): string => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setPhoneNumber(formatPhoneNumber(rawValue)); // Actualiza con formato
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetForm(); // Restablecer valores al cerrar el modal
        onClose();
      }}
      title={client ? "Editar Cliente" : "Crear Cliente"}
      zIndex={1000}
    >
      <Box>
        <TextInput
          mt="md"
          label="Nombre"
          value={name}
          onChange={handleInputChange(setName)}
          required
        />
        <TextInput
          mt="md"
          label="Número de Teléfono"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          required
        />
        <TextInput
          mt="md"
          label="Correo Electrónico"
          value={email}
          onChange={handleInputChange(setEmail)}
        />
        <DateInput
          mt="md"
          label="Fecha de Nacimiento"
          value={birthDate}
          locale="es"
          valueFormat="DD/MM/YYYY"
          onChange={(value) => setBirthDate(value || null)}
          placeholder="Selecciona una fecha"
          maxDate={new Date()}
          clearable
        />
        <Button mt="md" color="blue" onClick={handleSubmit}>
          {client ? "Actualizar Cliente" : "Crear Cliente"}
        </Button>
      </Box>
    </Modal>
  );
};

export default ClientFormModal;
