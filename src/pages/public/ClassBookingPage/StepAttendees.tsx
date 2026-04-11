import React, { useState } from "react";
import {
  Stack, TextInput, Switch, Divider, Text, Alert,
  Badge, Card, Group, ThemeIcon,
} from "@mantine/core";
import { IconUsers, IconDiscount, IconAlertCircle } from "@tabler/icons-react";
import { CountryCode } from "libphonenumber-js";
import InternationalPhoneInput from "../../../components/InternationalPhoneInput";
import { ClassType } from "../../../services/classService";

export interface AttendeeForm {
  name: string;
  phone: string;
  phone_e164: string;
  phone_country: string;
  email: string;
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
});

export { emptyAttendee };

export default function StepAttendees({
  classDoc,
  attendee,
  companion,
  onAttendeeChange,
  onCompanionChange,
  onCompanionToggle,
  organizationCountry = "CO",
}: Props) {
  const discount = classDoc?.groupDiscount;
  const hasCompanion = companion !== null;

  // Calcula el descuento si hay acompañante
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

      {/* ── Datos del titular ───────────────────────── */}
      <TextInput
        label="Nombre completo"
        placeholder="Tu nombre"
        required
        value={attendee.name}
        onChange={(e) => onAttendeeChange("name", e.currentTarget.value)}
      />
      <InternationalPhoneInput
        label="Teléfono (WhatsApp)"
        value={attendee.phone_e164 || attendee.phone}
        organizationDefaultCountry={organizationCountry as CountryCode}
        onChange={(e164, country, _isValid) => {
          onAttendeeChange("phone_e164", e164 ?? "");
          onAttendeeChange("phone", e164 ?? "");
          onAttendeeChange("phone_country", country ?? "CO");
        }}
      />
      <TextInput
        label="Correo electrónico"
        placeholder="opcional"
        type="email"
        value={attendee.email}
        onChange={(e) => onAttendeeChange("email", e.currentTarget.value)}
      />

      <Divider />

      {/* ── Toggle acompañante ───────────────────────── */}
      {discount?.enabled && (
        <Alert
          icon={<IconDiscount size={16} />}
          color="blue"
          variant="light"
          radius="md"
        >
          <Text size="sm" fw={500}>
            ¡Descuento grupal disponible!
          </Text>
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

      {/* ── Datos del acompañante ───────────────────── */}
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
              onChange={(e164, country, _isValid) => {
                onCompanionChange("phone_e164", e164 ?? "");
                onCompanionChange("phone", e164 ?? "");
                onCompanionChange("phone_country", country ?? "CO");
              }}
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

      {/* ── Resumen de precio ───────────────────────── */}
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
              <Text fw={700} size="lg" c="green">
                ${totalPrice.toLocaleString("es-CO")}
              </Text>
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
