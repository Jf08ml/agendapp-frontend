/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { TextInput, Textarea, Button, Box, Modal, SimpleGrid } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { createClient, updateClient, Client } from "../../../services/clientService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import InternationalPhoneInput from "../../../components/InternationalPhoneInput";
import { CountryCode } from "libphonenumber-js";
import {
  DEFAULT_CLIENT_FORM_CONFIG,
  type ClientFieldConfig,
} from "../../../services/organizationService";

interface ClientFormModalProps {
  opened: boolean;
  onClose: () => void;
  fetchClients: () => void;
  client?: Client | null;
  setClient?: React.Dispatch<React.SetStateAction<Client | null>>;
}

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  opened,
  onClose,
  fetchClients,
  client,
  setClient,
}) => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode | null>(null);
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [documentId, setDocumentId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const organization = useSelector((s: RootState) => s.organization.organization);

  // Config dinámica
  const rawConfig = organization?.clientFormConfig;
  const identifierField: 'phone' | 'email' | 'documentId' =
    rawConfig?.identifierField ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    rawConfig?.fields?.length ? rawConfig.fields : DEFAULT_CLIENT_FORM_CONFIG.fields;
  const fieldCfg = (key: ClientFieldConfig['key']) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };

  const phoneCfg      = fieldCfg("phone");
  const emailCfg      = fieldCfg("email");
  const birthDateCfg  = fieldCfg("birthDate");
  const documentIdCfg = fieldCfg("documentId");
  const notesCfg      = fieldCfg("notes");

  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setPhoneE164(null);
    setPhoneCountry(null);
    setPhoneValid(false);
    setPhoneError(null);
    setEmail("");
    setEmailError(null);
    setBirthDate(null);
    setDocumentId("");
    setNotes("");
    setClient?.(null);
  };

  useEffect(() => {
    if (client) {
      setName(client.name.trim());
      const phoneVal = (client.phone_e164 || client.phoneNumber || "").trim();
      setPhoneNumber(phoneVal);
      setPhoneE164(phoneVal || null);
      setPhoneValid(true);
      setPhoneError(null);
      if (client.phone_country) setPhoneCountry(client.phone_country as CountryCode);
      setEmail(client.email?.trim() || "");
      setEmailError(null);
      setBirthDate(client.birthDate ? new Date(client.birthDate) : null);
      setDocumentId((client as any).documentId?.trim() || "");
      setNotes((client as any).notes?.trim() || "");
    } else {
      resetForm();
    }
  }, [client, opened]);

  const handleSubmit = async (): Promise<void> => {
    // Nombre siempre requerido
    if (!name.trim()) {
      showNotification({ title: "Error", message: "El nombre es requerido", color: "red", autoClose: 2000 });
      return;
    }

    // Validar identificador
    if (identifierField === "phone") {
      if (!phoneNumber.trim()) { setPhoneError("El teléfono es requerido"); return; }
      if (!phoneValid || !phoneE164) { setPhoneError("Ingresa un número de teléfono válido"); return; }
    } else if (identifierField === "email") {
      if (!email.trim()) {
        setEmailError("El correo es requerido como identificador");
        return;
      }
      if (!isValidEmail(email)) { setEmailError("Correo no válido"); return; }
    } else if (identifierField === "documentId") {
      if (!documentId.trim()) {
        showNotification({ title: "Error", message: "El número de documento es requerido", color: "red", autoClose: 2000 });
        return;
      }
    }

    // Teléfono siempre requerido por la plataforma (para WhatsApp)
    if (identifierField !== "phone") {
      if (!phoneNumber.trim()) { setPhoneError("El teléfono es requerido"); return; }
      if (!phoneValid || !phoneE164) { setPhoneError("Ingresa un número de teléfono válido"); return; }
    }

    // Email requerido si así está configurado
    if (identifierField !== "email" && emailCfg.required && !email.trim()) {
      setEmailError("El correo es requerido");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setEmailError("Correo no válido");
      return;
    }

    setLoading(true);
    try {
      if (!organizationId) throw new Error("Organization ID is required");

      const payload = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        phone_country: phoneCountry || undefined,
        email: email.trim() || undefined,
        birthDate: birthDate || null,
        documentId: documentId.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (client) {
        await updateClient(client._id, payload);
        showNotification({ title: "Éxito", message: "Cliente actualizado con éxito", color: "green", autoClose: 2000, position: "top-right" });
      } else {
        await createClient({ ...payload, organizationId });
        showNotification({ title: "Éxito", message: "Cliente creado con éxito", color: "green", autoClose: 2000, position: "top-right" });
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

  const phoneInput = (required: boolean) => (
    <InternationalPhoneInput
      value={phoneNumber}
      organizationDefaultCountry={organization?.default_country as CountryCode}
      onChange={(e164, country, isValid) => {
        setPhoneE164(e164);
        setPhoneCountry(country);
        setPhoneValid(isValid);
        if (e164) setPhoneNumber(e164);
        setPhoneError(e164 && !isValid ? "Número de teléfono inválido" : null);
      }}
      error={phoneError}
      label={phoneCfg.label || "Teléfono"}
      placeholder="300 000 0000"
      required={required}
    />
  );

  return (
    <Modal
      opened={opened}
      onClose={() => { resetForm(); onClose(); }}
      title={client ? "Editar cliente" : "Crear cliente"}
      centered
      radius="md"
      zIndex={999}
    >
      <Box>
        {/* ── IDENTIFICADOR (siempre primero) ─────────── */}
        {identifierField === "phone" && phoneInput(true)}

        {identifierField === "email" && (
          <TextInput
            label={emailCfg.label || "Correo electrónico"}
            placeholder="correo@dominio.com"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.currentTarget.value); setEmailError(null); }}
            error={emailError}
            required
            mb="sm"
          />
        )}

        {identifierField === "documentId" && (
          <TextInput
            label={documentIdCfg.label || "Número de documento"}
            placeholder="Cédula, pasaporte, etc."
            value={documentId}
            onChange={(e) => setDocumentId(e.currentTarget.value)}
            required
            mb="sm"
          />
        )}

        {/* ── NOMBRE (siempre) ─────────────────────────── */}
        <TextInput
          label="Nombre"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          mb="sm"
        />

        {/* ── TELÉFONO si no es el identificador (siempre requerido) */}
        {identifierField !== "phone" && phoneInput(true)}

        {/* ── CAMPOS SECUNDARIOS según config ──────────── */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {emailCfg.enabled && identifierField !== "email" && (
            <TextInput
              label={emailCfg.label || "Correo electrónico"}
              placeholder="correo@dominio.com"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.currentTarget.value); setEmailError(null); }}
              error={emailError}
              required={emailCfg.required}
            />
          )}

          {birthDateCfg.enabled && (
            <DateInput
              label={birthDateCfg.label || "Fecha de nacimiento"}
              value={birthDate}
              locale="es"
              valueFormat="DD/MM/YYYY"
              onChange={(v) => setBirthDate(v || null)}
              placeholder="Selecciona una fecha"
              maxDate={new Date()}
              required={birthDateCfg.required}
              clearable
              popoverProps={{ zIndex: 2000 }}
            />
          )}

          {documentIdCfg.enabled && identifierField !== "documentId" && (
            <TextInput
              label={documentIdCfg.label || "Número de documento"}
              placeholder="Cédula, pasaporte, etc."
              value={documentId}
              onChange={(e) => setDocumentId(e.currentTarget.value)}
              required={documentIdCfg.required}
            />
          )}
        </SimpleGrid>

        {notesCfg.enabled && (
          <Textarea
            mt="sm"
            label={notesCfg.label || "Notas"}
            placeholder="Información adicional del cliente"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            required={notesCfg.required}
            minRows={2}
            autosize
          />
        )}

        <Box mt="md" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={() => { resetForm(); onClose(); }}>
            Cancelar
          </Button>
          <Button color="blue" onClick={handleSubmit} loading={loading}>
            {client ? "Actualizar cliente" : "Crear cliente"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ClientFormModal;
