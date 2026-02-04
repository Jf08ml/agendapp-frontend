import { SimpleGrid, Stack, TextInput, Textarea, Select } from "@mantine/core";
import { useMemo } from "react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import { TIMEZONES_BY_COUNTRY, getAllTimezones, type CountryCode } from "../../constants/timezoneByCountry";

export default function ContactTab({
  form,
  isEditing,
  domains,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  domains: string[];
}) {
  const selectedCountry = form.values.default_country as CountryCode | undefined;

  // Filtrar timezones según el país seleccionado
  const availableTimezones = useMemo(() => {
    if (!selectedCountry || !TIMEZONES_BY_COUNTRY[selectedCountry]) {
      return getAllTimezones();
    }
    return TIMEZONES_BY_COUNTRY[selectedCountry];
  }, [selectedCountry]);
  return (
    <Stack gap="md">
      <SectionCard
        title="Nombre y contacto"
        description="Estos datos se usan en tu encabezado, recibos y comunicaciones."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Nombre"
            {...form.getInputProps("name")}
            disabled={!isEditing}
          />
          <TextInput
            label="Correo electrónico"
            {...form.getInputProps("email")}
            disabled={!isEditing}
          />
          <TextInput
            label="Teléfono"
            {...form.getInputProps("phoneNumber")}
            disabled={!isEditing}
          />
          <Select
            label="País por defecto"
            description="País para validar números telefónicos de nuevos clientes"
            {...form.getInputProps("default_country")}
            disabled={!isEditing}
            data={[
              { value: "CO", label: "🇨🇴 Colombia" },
              { value: "MX", label: "🇲🇽 México" },
              { value: "PE", label: "🇵🇪 Perú" },
              { value: "EC", label: "🇪🇨 Ecuador" },
              { value: "VE", label: "🇻🇪 Venezuela" },
              { value: "PA", label: "🇵🇦 Panamá" },
              { value: "CR", label: "🇨🇷 Costa Rica" },
              { value: "CL", label: "🇨🇱 Chile" },
              { value: "AR", label: "🇦🇷 Argentina" },
              { value: "BR", label: "🇧🇷 Brasil" },
              { value: "US", label: "🇺🇸 Estados Unidos" },
              { value: "CA", label: "🇨🇦 Canadá" },
              { value: "SV", label: "🇸🇻 El Salvador" },
              { value: "ES", label: "🇪🇸 España" },
            ]}
          />
          <Select
            label="Zona horaria"
            description={selectedCountry
              ? `Zonas horarias disponibles en ${selectedCountry === 'CO' ? 'Colombia' : selectedCountry === 'MX' ? 'México' : selectedCountry === 'PE' ? 'Perú' : selectedCountry === 'EC' ? 'Ecuador' : selectedCountry === 'VE' ? 'Venezuela' : selectedCountry === 'PA' ? 'Panamá' : selectedCountry === 'CR' ? 'Costa Rica' : selectedCountry === 'CL' ? 'Chile' : selectedCountry === 'AR' ? 'Argentina' : selectedCountry === 'BR' ? 'Brasil' : selectedCountry === 'US' ? 'EE.UU.' : selectedCountry === 'CA' ? 'Canadá' : selectedCountry === 'ES' ? 'España' : selectedCountry === 'SV' ? 'El Salvador' : 'el país seleccionado'}`
              : "Selecciona un país primero"}
            {...form.getInputProps("timezone")}
            disabled={!isEditing || !selectedCountry}
            searchable
            data={availableTimezones.map(tz => ({
              value: tz.value,
              label: `${tz.label} ${tz.offset}`,
            }))}
          />
          <Select
            label="Moneda"
            description="Moneda principal usada por la organización"
            {...form.getInputProps("currency")}
            disabled={!isEditing}
            data={[
              { value: "COP", label: "COP - Peso colombiano" },
              { value: "MXN", label: "MXN - Peso mexicano" },
              { value: "USD", label: "USD - Dólar americano" },
              { value: "EUR", label: "EUR - Euro" },
              { value: "CLP", label: "CLP - Peso chileno" },
              { value: "CRC", label: "CRC - Colón costarricense" },
              { value: "ARS", label: "ARS - Peso argentino" },
              { value: "BRL", label: "BRL - Real brasileño" },
              { value: "PEN", label: "PEN - Sol peruano" },
              { value: "VES", label: "VES - Bolívar venezolano" },
              { value: "PAB", label: "PAB - Balboa panameño" },
              { value: "CAD", label: "CAD - Dólar canadiense" },
            ]}
          />
          <TextInput
            label="Dominios"
            value={(domains || []).join(", ")}
            disabled
          />
        </SimpleGrid>
      </SectionCard>

      <SectionCard
        title="Mensaje de bienvenida"
        description="Personaliza el mensaje que verán tus clientes en la página de inicio."
      >
        <Stack gap="md">
          <Select
            label="Diseño de página de inicio"
            description="Elige cómo se mostrará la página principal a tus clientes"
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
