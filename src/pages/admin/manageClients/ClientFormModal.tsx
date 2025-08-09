/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, ChangeEvent } from "react";
import { TextInput, Button, Box, Modal, Group } from "@mantine/core";
import { createClient, updateClient, Client } from "../../../services/clientService";
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
  const [loading, setLoading] = useState<boolean>(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);

  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setEmail("");
    setBirthDate(null);
    setClient?.(null);
  };

  useEffect(() => {
    if (client) {
      setName(client.name.trim());
      setPhoneNumber(formatPhoneNumber(client.phoneNumber.trim()));
      setEmail(client.email?.trim() || "");
      setBirthDate(client.birthDate ? new Date(client.birthDate) : null);
    } else {
      resetForm();
    }
  }, [client, opened]);

  const handleSubmit = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!organizationId) throw new Error("Organization ID is required");

      const formattedPhoneNumber = phoneNumber.replace(/\s/g, "");

      if (client) {
        await updateClient(client._id, {
          name: name.trim(),
          phoneNumber: formattedPhoneNumber,
          email: email.trim(),
          birthDate: birthDate || null,
        });
        showNotification({
          title: "Éxito",
          message: "Cliente actualizado con éxito",
          color: "green",
          autoClose: 2000,
          position: "top-right",
        });
      } else {
        await createClient({
          name: name.trim(),
          phoneNumber: formattedPhoneNumber,
          email: email.trim(),
          organizationId,
          birthDate: birthDate || null,
        });
        showNotification({
          title: "Éxito",
          message: "Cliente creado con éxito",
          color: "green",
          autoClose: 2000,
          position: "top-right",
        });
      }

      fetchClients();
      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: client ? "Error al actualizar el cliente" : "Error al crear el cliente",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: ChangeEvent<HTMLInputElement>) => setter(event.target.value);

  const formatPhoneNumber = (value: string) =>
    value.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{0,4})/, (_m, a, b, c) =>
      c ? `${a} ${b} ${c}` : `${a} ${b}`
    );

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(event.target.value));
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={client ? "Editar cliente" : "Crear cliente"}
      centered
      radius="md"
      zIndex={999}
    >
      <Box>
        <Group grow align="flex-start">
          <TextInput
            mt="sm"
            label="Nombre"
            placeholder="Nombre completo"
            value={name}
            onChange={handleInputChange(setName)}
            required
          />
          <TextInput
            mt="sm"
            label="Teléfono"
            placeholder="300 000 0000"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            required
          />
        </Group>

        <Group grow align="flex-start">
          <TextInput
            mt="sm"
            label="Correo electrónico"
            placeholder="correo@dominio.com"
            value={email}
            onChange={handleInputChange(setEmail)}
          />
          <DateInput
            mt="sm"
            label="Fecha de nacimiento"
            value={birthDate}
            locale="es"
            valueFormat="DD/MM/YYYY"
            onChange={(value) => setBirthDate(value || null)}
            placeholder="Selecciona una fecha"
            maxDate={new Date()}
            clearable
            popoverProps={{ zIndex: 2000 }}
          />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => { resetForm(); onClose(); }}>
            Cancelar
          </Button>
          <Button color="blue" onClick={handleSubmit} loading={loading}>
            {client ? "Actualizar cliente" : "Crear cliente"}
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default ClientFormModal;
