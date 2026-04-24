/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Stack, TextInput, Textarea, Switch, Divider, Text, Alert,
  Badge, Card, Group, ThemeIcon, Loader,
} from "@mantine/core";
import { IconUsers, IconDiscount } from "@tabler/icons-react";
import { CountryCode } from "libphonenumber-js";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import InternationalPhoneInput from "../../../components/InternationalPhoneInput";
import { ClassType } from "../../../services/classService";
import { getClientByIdentifier } from "../../../services/clientService";
import {
  DEFAULT_CLIENT_FORM_CONFIG,
  type ClientFieldConfig,
} from "../../../services/organizationService";

export interface AttendeeForm {
  name: string;
  phone: string;
  phone_e164: string;
  phone_country: string;
  email: string;
  documentId: string;
  notes: string;
}

interface Props {
  classDoc: ClassType | null;
  attendee: AttendeeForm;
  companion: AttendeeForm | null;
  onAttendeeChange: (field: keyof AttendeeForm, value: string) => void;
  onCompanionChange: (field: keyof AttendeeForm, value: string) => void;
  onCompanionToggle: (enabled: boolean) => void;
  organizationCountry?: string;
}

const emptyAttendee = (): AttendeeForm => ({
  name: "", phone: "", phone_e164: "", phone_country: "CO", email: "",
  documentId: "", notes: "",
});

export { emptyAttendee };

const isValidEmail = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

export default function StepAttendees({
  classDoc,
  attendee,
  companion,
  onAttendeeChange,
  onCompanionChange,
  onCompanionToggle,
  organizationCountry = "CO",
}: Props) {
  const organization = useSelector((s: RootState) => s.organization.organization);

  const rawConfig = organization?.clientFormConfig;
  const identifierField: 'phone' | 'email' | 'documentId' =
    rawConfig?.identifierField ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    rawConfig?.fields?.length ? rawConfig.fields : DEFAULT_CLIENT_FORM_CONFIG.fields;

  const fieldCfg = (key: ClientFieldConfig['key']) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };

  const phoneCfg      = fieldCfg("phone");
  const emailCfg      = fieldCfg("email");
  const documentIdCfg = fieldCfg("documentId");
  const notesCfg      = fieldCfg("notes");

  // birthDate is not part of AttendeeForm; skip rendering if enabled — enrollment doesn't use it

  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundName, setFoundName] = useState<string | null>(null);

  const runLookup = async (field: typeof identifierField, value: string) => {
    const orgId = organization?._id as string;
    if (!value?.trim() || !orgId) return;
    setIsLookingUp(true);
    setFoundName(null);
    try {
      const client = await getClientByIdentifier(field, value, orgId);
      if (client) {
        if (!attendee.name.trim() && client.name) onAttendeeChange("name", client.name);
        if (!attendee.email.trim() && client.email) onAttendeeChange("email", client.email);
        if (!attendee.documentId.trim() && (client as any).documentId) onAttendeeChange("documentId", (client as any).documentId);
        setFoundName(client.name || null);
      }
    } catch {
      // silencioso
    } finally {
      setIsLookingUp(false);
    }
  };

  const handlePhoneIdentifierBlur = async () => {
    if (!phoneValid || !attendee.phone_e164) {
      if (attendee.phone) setPhoneError("Número de teléfono inválido");
      return;
    }
    await runLookup("phone", attendee.phone_e164);
  };

  const handleEmailBlur = async () => {
    const email = attendee.email.trim();
    if (email && !isValidEmail(email)) { setEmailError("Correo no válido"); return; }
    setEmailError(null);
    if (identifierField === "email" && email) await runLookup("email", email);
  };

  const handleDocumentIdBlur = async () => {
    const val = attendee.documentId.trim();
    if (val) await runLookup("documentId", val);
  };

  const LookupFeedback = () => (
    <>
      {isLookingUp && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">Buscando por {IDENTIFIER_LABELS[identifierField]}...</Text>
        </Group>
      )}
      {foundName && !isLookingUp && (
        <Group gap="xs">
          <Text size="xs" c="dimmed">Cliente encontrado:</Text>
          <Badge variant="light" size="sm">{foundName}</Badge>
        </Group>
      )}
    </>
  );

  const discount = classDoc?.groupDiscount;
  const hasCompanion = companion !== null;
  const numPeople = hasCompanion ? 2 : 1;
  const discountApplies =
    discount?.enabled &&
    numPeople >= (discount.minPeople ?? 2) &&
    (!discount.maxPeople || numPeople <= discount.maxPeople);
  const discountPct = discountApplies ? discount!.discountPercent : 0;
  const pricePerPerson = classDoc?.pricePerPerson ?? 0;
  const finalPricePerPerson = Math.round(pricePerPerson * (1 - discountPct / 100));
  const totalPrice = finalPricePerPerson * numPeople;

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Tus datos</Text>

      {/* ── CAMPO IDENTIFICADOR (siempre primero) ───────── */}

      {identifierField === "phone" && (
        <Stack gap={6}>
          <InternationalPhoneInput
            label={phoneCfg.label || IDENTIFIER_LABELS.phone}
            value={attendee.phone_e164 || attendee.phone}
            organizationDefaultCountry={organizationCountry as CountryCode}
            onChange={(e164, country, isValid) => {
              onAttendeeChange("phone_e164", e164 ?? "");
              onAttendeeChange("phone", e164 ?? "");
              onAttendeeChange("phone_country", country ?? "CO");
              setPhoneValid(isValid);
              setPhoneError(null);
            }}
            onBlur={handlePhoneIdentifierBlur}
            error={phoneError}
            required
            compact
          />
          <LookupFeedback />
        </Stack>
      )}

      {identifierField === "email" && (
        <Stack gap={6}>
          <TextInput
            label={emailCfg.label || IDENTIFIER_LABELS.email}
            placeholder="Ingresa tu correo"
            type="email"
            value={attendee.email}
            onChange={(e) => onAttendeeChange("email", e.currentTarget.value)}
            onBlur={handleEmailBlur}
            error={emailError}
            required
            disabled={isLookingUp}
            autoComplete="email"
          />
          <LookupFeedback />
        </Stack>
      )}

      {identifierField === "documentId" && (
        <Stack gap={6}>
          <TextInput
            label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
            placeholder="Cédula, pasaporte, etc."
            value={attendee.documentId}
            onChange={(e) => onAttendeeChange("documentId", e.currentTarget.value)}
            onBlur={handleDocumentIdBlur}
            required
            disabled={isLookingUp}
          />
          <LookupFeedback />
        </Stack>
      )}

      {/* ── NOMBRE (siempre) ────────────────────────────── */}
      <TextInput
        label="Nombre completo"
        placeholder="Tu nombre"
        required
        value={attendee.name}
        onChange={(e) => onAttendeeChange("name", e.currentTarget.value)}
        disabled={isLookingUp}
      />

      {/* ── CAMPOS SECUNDARIOS ──────────────────────────── */}
      {phoneCfg.enabled && identifierField !== "phone" && (
        <InternationalPhoneInput
          label={phoneCfg.label || IDENTIFIER_LABELS.phone}
          value={attendee.phone_e164 || attendee.phone}
          organizationDefaultCountry={organizationCountry as CountryCode}
          onChange={(e164, country, isValid) => {
            onAttendeeChange("phone_e164", e164 ?? "");
            onAttendeeChange("phone", e164 ?? "");
            onAttendeeChange("phone_country", country ?? "CO");
            setPhoneValid(isValid);
            if (e164 && !isValid) setPhoneError("Número inválido");
            else setPhoneError(null);
          }}
          error={phoneError}
          required={phoneCfg.required}
          compact
        />
      )}

      {emailCfg.enabled && identifierField !== "email" && (
        <TextInput
          label={emailCfg.label || IDENTIFIER_LABELS.email}
          placeholder="opcional"
          type="email"
          value={attendee.email}
          onChange={(e) => onAttendeeChange("email", e.currentTarget.value)}
          onBlur={handleEmailBlur}
          error={emailError}
          required={emailCfg.required}
          autoComplete="email"
        />
      )}

      {documentIdCfg.enabled && identifierField !== "documentId" && (
        <TextInput
          label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
          placeholder="Cédula, pasaporte, etc."
          value={attendee.documentId}
          onChange={(e) => onAttendeeChange("documentId", e.currentTarget.value)}
          required={documentIdCfg.required}
        />
      )}

      {notesCfg.enabled && (
        <Textarea
          label={notesCfg.label || "Notas"}
          placeholder="Información adicional..."
          value={attendee.notes}
          onChange={(e) => onAttendeeChange("notes", e.currentTarget.value)}
          required={notesCfg.required}
          minRows={2}
          autosize
        />
      )}

      <Divider />

      {/* ── Toggle acompañante ──────────────────────────── */}
      {discount?.enabled && (
        <Alert icon={<IconDiscount size={16} />} color="blue" variant="light" radius="md">
          <Text size="sm" fw={500}>¡Descuento grupal disponible!</Text>
          <Text size="xs" mt={2}>
            Si reservas con {discount.minPeople} o más personas
            {discount.maxPeople ? ` (máx. ${discount.maxPeople})` : ""}, obtienes un{" "}
            <b>{discount.discountPercent}% de descuento</b> por persona.
          </Text>
        </Alert>
      )}

      <Switch
        label="¿Vas con un acompañante?"
        description="Agrega los datos de quien te acompañará"
        checked={hasCompanion}
        onChange={(e) => onCompanionToggle(e.currentTarget.checked)}
        size="md"
      />

      {/* ── Datos del acompañante (siempre teléfono + nombre, simple) */}
      {hasCompanion && companion && (
        <Card withBorder radius="md" p="md" bg="var(--mantine-color-gray-0)">
          <Group gap="xs" mb="sm">
            <ThemeIcon size="sm" variant="light" color="blue" radius="xl">
              <IconUsers size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">Datos del acompañante</Text>
          </Group>
          <Stack gap="sm">
            <TextInput
              label="Nombre completo"
              placeholder="Nombre de tu acompañante"
              required
              value={companion.name}
              onChange={(e) => onCompanionChange("name", e.currentTarget.value)}
            />
            <InternationalPhoneInput
              label="Teléfono (WhatsApp)"
              value={companion.phone_e164 || companion.phone}
              organizationDefaultCountry={organizationCountry as CountryCode}
              onChange={(e164, country) => {
                onCompanionChange("phone_e164", e164 ?? "");
                onCompanionChange("phone", e164 ?? "");
                onCompanionChange("phone_country", country ?? "CO");
              }}
              compact
            />
            <TextInput
              label="Correo electrónico"
              placeholder="opcional"
              type="email"
              value={companion.email}
              onChange={(e) => onCompanionChange("email", e.currentTarget.value)}
            />
          </Stack>
        </Card>
      )}

      {/* ── Resumen de precio ───────────────────────────── */}
      {classDoc && (
        <Card withBorder radius="md" p="md" bg="var(--mantine-color-green-0)">
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm">Precio por persona</Text>
              <Text size="sm">${pricePerPerson.toLocaleString("es-CO")}</Text>
            </Group>
            {numPeople > 1 && (
              <Group justify="space-between">
                <Text size="sm">Personas</Text>
                <Text size="sm">× {numPeople}</Text>
              </Group>
            )}
            {discountApplies && (
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" c="green" fw={500}>Descuento grupal</Text>
                  <Badge size="xs" color="green" variant="light">-{discountPct}%</Badge>
                </Group>
                <Text size="sm" c="green" fw={500}>
                  -${(pricePerPerson * numPeople - totalPrice).toLocaleString("es-CO")}
                </Text>
              </Group>
            )}
            <Divider my={4} />
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700} size="lg" c="green">${totalPrice.toLocaleString("es-CO")}</Text>
            </Group>
            {discountApplies && numPeople > 1 && (
              <Text size="xs" c="dimmed" ta="right">
                (${finalPricePerPerson.toLocaleString("es-CO")} por persona)
              </Text>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
