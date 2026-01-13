/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, ChangeEvent } from "react";
import { TextInput, Button, Box, Modal, Group } from "@mantine/core";
import { createClient, updateClient, Client } from "../../../services/clientService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { DateInput } from "@mantine/dates";
import InternationalPhoneInput from "../../../components/InternationalPhoneInput";
import { CountryCode } from "libphonenumber-js";

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
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [, setPhoneCountry] = useState<CountryCode | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);

  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setPhoneE164(null);
    setPhoneCountry(null);
    setPhoneValid(false);
    setPhoneError(null);
    setEmail("");
    setBirthDate(null);
    setClient?.(null);
  };

  useEffect(() => {
    if (client) {
      setName(client.name.trim());
      setPhoneNumber(client.phoneNumber.trim());
      setEmail(client.email?.trim() || "");
      setBirthDate(client.birthDate ? new Date(client.birthDate) : null);
      
      // Resetear estados de validación al cargar cliente existente
      setPhoneError(null);
      setPhoneValid(true); // Asumimos que cliente existente tiene teléfono válido
    } else {
      resetForm();
    }
  }, [client, opened]);

  const handleSubmit = async (): Promise<void> => {
    console.log('[ClientFormModal] handleSubmit - phoneNumber:', phoneNumber, 'phoneE164:', phoneE164, 'phoneValid:', phoneValid);
    
    // Validación del nombre
    if (!name.trim()) {
      showNotification({
        title: "Error",
        message: "El nombre es requerido",
        color: "red",
        autoClose: 2000,
      });
      return;
    }
    
    // Validación del teléfono antes de enviar
    if (!phoneNumber.trim()) {
      setPhoneError("El teléfono es requerido");
      return;
    }

    if (!phoneValid || !phoneE164) {
      setPhoneError("Por favor ingresa un número de teléfono válido");
      return;
    }

    setLoading(true);
    try {
      if (!organizationId) throw new Error("Organization ID is required");

      if (client) {
        await updateClient(client._id, {
          name: name.trim(),
          phoneNumber: phoneNumber.trim(), // Enviar el número como lo ingresa el usuario
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
          phoneNumber: phoneNumber.trim(), // Enviar el número como lo ingresa el usuario
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
    } catch (err: any) {
      console.error(err);
      showNotification({
        title: "Error",
        message: err.message || (client ? "Error al actualizar el cliente" : "Error al crear el cliente"),
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

  const handlePhoneChange = (phone_e164: string | null, phone_country: CountryCode | null, isValid: boolean, nationalNumber: string = "") => {
    setPhoneE164(phone_e164);
    setPhoneCountry(phone_country);
    setPhoneValid(isValid);
    // Actualizar el phoneNumber con el valor que viene de InternationalPhoneInput
    if (phone_e164) {
      setPhoneNumber(phone_e164);
    }
    
    // No mostrar error mientras el usuario está escribiendo (campo vacío es normal)
    // Solo mostrar error si escribió algo pero es inválido
    if (!isValid && phone_e164) {
      setPhoneError("Número de teléfono inválido");
    } else {
      setPhoneError(null);
    }
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
        </Group>

        <InternationalPhoneInput
          value={phoneNumber}
          organizationDefaultCountry={organization?.default_country as CountryCode}
          onChange={handlePhoneChange}
          error={phoneError}
          label="Teléfono"
          placeholder="300 000 0000"
          required
        />

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
