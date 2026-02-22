import { SimpleGrid, Stack, TextInput, Textarea, Select } from "@mantine/core";
import { useMemo } from "react";
import {
  IconBuilding,
  IconMail,
  IconPhone,
  IconGlobe,
  IconClock,
  IconCurrencyDollar,
  IconLink,
  IconLayoutColumns,
  IconWriting,
} from "@tabler/icons-react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import { getAllCountries, getAllTimezones, getAllCurrencies } from "../../../../../utils/geoData";

export default function ContactTab({
  form,
  isEditing,
  domains,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  domains: string[];
}) {
  // Listas completas memoizadas (ya están memoizadas en geoData, pero useMemo
  // evita recalcular el .map() del Select en cada render).
  const countryData = useMemo(
    () => getAllCountries().map((c) => ({ value: c.value, label: c.label })),
    []
  );

  const timezoneData = useMemo(
    () => getAllTimezones().map((tz) => ({ value: tz.value, label: tz.label })),
    []
  );

  const currencyData = useMemo(
    () => getAllCurrencies().map((c) => ({ value: c.value, label: c.label })),
    []
  );

  return (
    <Stack gap="md">
      <SectionCard
        title="Nombre y contacto"
        description="Estos datos se usan en tu encabezado, recibos y comunicaciones con clientes."
        icon={<IconBuilding size={16} />}
        iconColor="blue"
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Nombre del negocio"
            placeholder="Mi Salón"
            leftSection={<IconBuilding size={16} />}
            {...form.getInputProps("name")}
            disabled={!isEditing}
          />
          <TextInput
            label="Correo electrónico"
            placeholder="contacto@minegocio.com"
            leftSection={<IconMail size={16} />}
            {...form.getInputProps("email")}
            disabled={!isEditing}
          />
          <TextInput
            label="Teléfono"
            placeholder="+57 300 000 0000"
            leftSection={<IconPhone size={16} />}
            {...form.getInputProps("phoneNumber")}
            disabled={!isEditing}
          />
          <Select
            label="País por defecto"
            description="País para validar números telefónicos de nuevos clientes"
            leftSection={<IconGlobe size={16} />}
            {...form.getInputProps("default_country")}
            disabled={!isEditing}
            searchable
            data={countryData}
          />
          <Select
            label="Zona horaria"
            description="Busca tu zona horaria (ej: America/Bogota, Europe/Madrid)"
            leftSection={<IconClock size={16} />}
            {...form.getInputProps("timezone")}
            disabled={!isEditing}
            searchable
            data={timezoneData}
          />
          <Select
            label="Moneda"
            description="Moneda principal usada por la organización"
            leftSection={<IconCurrencyDollar size={16} />}
            {...form.getInputProps("currency")}
            disabled={!isEditing}
            searchable
            data={currencyData}
          />
          <TextInput
            label="Dominios"
            description="Gestionados por el equipo de soporte"
            leftSection={<IconLink size={16} />}
            value={(domains || []).join(", ")}
            disabled
          />
        </SimpleGrid>
      </SectionCard>

      <SectionCard
        title="Mensaje de bienvenida"
        description="Personaliza el mensaje que verán tus clientes en la página de inicio pública."
        icon={<IconWriting size={16} />}
        iconColor="violet"
      >
        <Stack gap="md">
          <Select
            label="Diseño de página de inicio"
            description="Elige cómo se mostrará la página principal a tus clientes"
            leftSection={<IconLayoutColumns size={16} />}
            {...form.getInputProps("homeLayout")}
            disabled={!isEditing}
            data={[
              { value: "modern", label: "Moderno - Con gradientes difuminados" },
              { value: "minimal", label: "Minimalista - Diseño limpio y simple" },
              { value: "cards", label: "Tarjetas - Enfoque en servicios" },
              { value: "landing", label: "Landing - Página de presentación completa" },
            ]}
          />
          <TextInput
            label="Título de bienvenida"
            placeholder="¡Hola! Bienvenido"
            {...form.getInputProps("welcomeTitle")}
            disabled={!isEditing}
          />
          <Textarea
            label="Descripción de bienvenida"
            placeholder="Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨"
            {...form.getInputProps("welcomeDescription")}
            disabled={!isEditing}
            minRows={3}
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
